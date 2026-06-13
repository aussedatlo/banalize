//! Fake `iptables` binary used by the e2e test-suite.
//!
//! The real `iptables` requires root and mutates the host firewall, so the
//! `banalize-core` binary is pointed at this stand-in via `BANALIZE_IPTABLE_BIN`.
//! Earlier this was a write-only logger that answered every existence check with
//! "not found". That made whole classes of behaviour untestable: idempotent
//! bans, restart against a pre-existing chain, deletion of a missing rule, and
//! the "firewall error is ignored" contract.
//!
//! This version keeps a small persistent model of the ruleset so it behaves like
//! the real tool for the subset of commands the `iptables` crate emits:
//!
//!   * state is persisted next to the command log (`<log>.state`) and guarded by
//!     a cross-process lock so concurrent invocations don't corrupt it;
//!   * `-S` renders the current ruleset (this is what the crate greps for its
//!     existence checks, since the firewall runs with `has_check = false`);
//!   * `-N` / `-X` / `-F` / `-A` / `-I` / `-D` / `-C` mutate or query that state
//!     and return iptables-compatible exit codes and stderr on failure;
//!   * `BANALIZE_FAKE_IPTABLES_FAIL` lets a test force matching commands to fail,
//!     to exercise the firewall error-handling paths.
//!
//! Every mutating command is still appended verbatim to
//! `BANALIZE_FAKE_IPTABLES_LOG` so existing substring assertions keep working.

use std::collections::BTreeMap;
use std::env;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::exit;
use std::thread;
use std::time::{Duration, Instant};

/// Built-in chains of the `filter` table — these always exist and cannot be
/// created or deleted, matching real iptables.
const BUILTIN_FILTER_CHAINS: &[&str] = &["INPUT", "FORWARD", "OUTPUT"];

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    // --version: probed by the iptables crate in IPTables::new(). The firewall's
    // fake path constructs IPTables directly, but answer anyway for safety.
    if args.iter().any(|a| a == "--version") {
        println!("iptables v1.8.9 (nf_tables)");
        return;
    }

    // Strip noise flags the crate appends so the positional grammar is clean.
    // `-t <table>` is also dropped: we only ever model the `filter` table.
    let tokens = normalize(&args);

    let action = match tokens.first() {
        Some(a) => a.clone(),
        // No recognizable action (e.g. only `--wait`): succeed silently.
        None => return,
    };
    let rest = &tokens[1..];

    // Queries (`-S`, `-C`) are read-only and must not be logged: the firewall's
    // existence check spams `-S` and tests count the mutating commands.
    let is_query = matches!(action.as_str(), "-S" | "-C" | "-L");

    if !is_query {
        log_command(&args);
    }

    // Optional fault injection: fail any command whose original line contains the
    // configured substring. Used to drive the "firewall error is ignored" path.
    if let Ok(needle) = env::var("BANALIZE_FAKE_IPTABLES_FAIL") {
        if !needle.is_empty() && args.join(" ").contains(&needle) {
            fail("iptables: simulated failure (BANALIZE_FAKE_IPTABLES_FAIL)");
        }
    }

    match action.as_str() {
        "-S" => list(rest),
        "-C" => check(rest),
        "-N" => new_chain(rest),
        "-X" => delete_chain(rest),
        "-F" => flush_chain(rest),
        "-A" => append(rest),
        "-I" => insert(rest),
        "-D" => delete(rest),
        // Anything else (`-L`, `-P`, `-R`, …) is accepted as a no-op success so
        // unforeseen commands never spuriously fail a test.
        _ => {}
    }
}

/// Drop `-t <table>`, `--wait`/`-w` and `-n`, leaving the action grammar.
fn normalize(args: &[String]) -> Vec<String> {
    let mut out = Vec::with_capacity(args.len());
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "-t" => i += 2, // skip flag and its table value
            "--wait" | "-w" | "-n" => i += 1,
            other => {
                out.push(other.to_string());
                i += 1;
            }
        }
    }
    out
}

fn log_command(args: &[String]) {
    if let Ok(log_path) = env::var("BANALIZE_FAKE_IPTABLES_LOG") {
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
            let _ = writeln!(f, "{}", args.join(" "));
        }
    }
}

/// Exit like iptables does on error: message on stderr, non-zero status.
fn fail(msg: &str) -> ! {
    eprintln!("{}", msg);
    exit(1);
}

// ---------------------------------------------------------------------------
// Persistent ruleset model
// ---------------------------------------------------------------------------

/// The modelled firewall: each chain maps to its ordered list of rule specs
/// (e.g. `-s 1.2.3.4 -j DROP`). Built-in chains are present implicitly.
#[derive(Default)]
struct State {
    chains: BTreeMap<String, Vec<String>>,
}

impl State {
    fn chain_exists(&self, chain: &str) -> bool {
        BUILTIN_FILTER_CHAINS.contains(&chain) || self.chains.contains_key(chain)
    }

    /// Serialize to an iptables-save-like form. This is what `-S` prints and what
    /// the `iptables` crate greps for `-A <chain> <rule>` in its existence check.
    fn render(&self) -> String {
        let mut out = String::new();
        for chain in BUILTIN_FILTER_CHAINS {
            out.push_str(&format!("-P {} ACCEPT\n", chain));
        }
        for chain in self.chains.keys() {
            if !BUILTIN_FILTER_CHAINS.contains(&chain.as_str()) {
                out.push_str(&format!("-N {}\n", chain));
            }
        }
        for (chain, rules) in &self.chains {
            for rule in rules {
                out.push_str(&format!("-A {} {}\n", chain, rule));
            }
        }
        out
    }

    fn parse(text: &str) -> Self {
        let mut state = State::default();
        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            match parts.as_slice() {
                ["-N", chain] => {
                    state.chains.entry(chain.to_string()).or_default();
                }
                ["-A", chain, rule @ ..] => {
                    state
                        .chains
                        .entry(chain.to_string())
                        .or_default()
                        .push(rule.join(" "));
                }
                _ => {}
            }
        }
        state
    }
}

fn state_path() -> Option<PathBuf> {
    env::var("BANALIZE_FAKE_IPTABLES_LOG")
        .ok()
        .map(|log| PathBuf::from(format!("{}.state", log)))
}

fn load_state() -> State {
    match state_path().and_then(|p| fs::read_to_string(p).ok()) {
        Some(text) => State::parse(&text),
        None => State::default(),
    }
}

fn save_state(state: &State) {
    if let Some(path) = state_path() {
        let _ = fs::write(path, state.render());
    }
}

/// Best-effort cross-process advisory lock around the read-modify-write cycle,
/// implemented with an exclusive-create lockfile. Concurrent firewall calls (the
/// cleaner racing the watcher, or a restarting instance) must not interleave
/// their state writes.
struct StateLock {
    path: Option<PathBuf>,
    held: bool,
}

impl StateLock {
    fn acquire() -> Self {
        let path = state_path().map(|p| p.with_extension("state.lock"));
        let mut held = false;
        if let Some(ref p) = path {
            let deadline = Instant::now() + Duration::from_secs(5);
            while Instant::now() < deadline {
                match OpenOptions::new().write(true).create_new(true).open(p) {
                    Ok(_) => {
                        held = true;
                        break;
                    }
                    // Held by another invocation: spin briefly and retry.
                    Err(_) => thread::sleep(Duration::from_millis(5)),
                }
            }
            // Timed out (likely a stale lock from a crashed run): proceed anyway
            // and take ownership so the lockfile gets cleaned up.
            if !held {
                held = true;
            }
        }
        StateLock { path, held }
    }
}

impl Drop for StateLock {
    fn drop(&mut self) {
        if self.held {
            if let Some(ref p) = self.path {
                let _ = fs::remove_file(p);
            }
        }
    }
}

/// Run a read-modify-write transaction against the persisted state. The closure
/// reports iptables-style failures via `Err`; state is only persisted on `Ok`.
/// The lock is always released (its `Drop`) before any `exit`, so a failing
/// command never leaks the lockfile.
fn with_state<F: FnOnce(&mut State) -> Result<(), String>>(f: F) {
    let result = {
        let _lock = StateLock::acquire();
        let mut state = load_state();
        let r = f(&mut state);
        if r.is_ok() {
            save_state(&state);
        }
        r
    };
    if let Err(msg) = result {
        fail(&msg);
    }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

fn list(rest: &[String]) {
    let state = load_state();
    match rest.first() {
        // `-S <chain>`: only that chain's rules (used by IPTables::list).
        Some(chain) => {
            if !state.chain_exists(chain) {
                fail("iptables: No chain/target/match by that name.");
            }
            if !BUILTIN_FILTER_CHAINS.contains(&chain.as_str()) {
                println!("-N {}", chain);
            }
            if let Some(rules) = state.chains.get(chain) {
                for rule in rules {
                    println!("-A {} {}", chain, rule);
                }
            }
        }
        // `-S`: the whole table.
        None => print!("{}", state.render()),
    }
}

fn check(rest: &[String]) {
    let (chain, rule) = match rest.split_first() {
        Some((c, r)) => (c.clone(), r.join(" ")),
        None => fail("iptables: missing chain for -C"),
    };
    let state = load_state();
    let present = state
        .chains
        .get(&chain)
        .map(|rules| rules.iter().any(|r| r == &rule))
        .unwrap_or(false);
    if !present {
        fail("iptables: Bad rule (does a matching rule exist in that chain?).");
    }
}

fn new_chain(rest: &[String]) {
    let chain = match rest.first() {
        Some(c) => c.clone(),
        None => fail("iptables: missing chain name for -N"),
    };
    with_state(|state| {
        if state.chain_exists(&chain) {
            return Err("iptables: Chain already exists.".to_string());
        }
        state.chains.insert(chain, Vec::new());
        Ok(())
    });
}

fn delete_chain(rest: &[String]) {
    let chain = match rest.first() {
        Some(c) => c.clone(),
        None => fail("iptables: missing chain name for -X"),
    };
    with_state(|state| {
        if BUILTIN_FILTER_CHAINS.contains(&chain.as_str()) {
            return Err("iptables: Cannot delete built-in chain.".to_string());
        }
        match state.chains.get(&chain) {
            None => Err("iptables: No chain/target/match by that name.".to_string()),
            // A non-empty chain must be flushed before it can be deleted.
            Some(rules) if !rules.is_empty() => Err("iptables: Directory not empty.".to_string()),
            Some(_) => {
                state.chains.remove(&chain);
                Ok(())
            }
        }
    });
}

fn flush_chain(rest: &[String]) {
    with_state(|state| match rest.first() {
        Some(chain) => {
            if !state.chain_exists(chain) {
                return Err("iptables: No chain/target/match by that name.".to_string());
            }
            state.chains.entry(chain.clone()).or_default().clear();
            Ok(())
        }
        // `-F` with no chain flushes every chain in the table.
        None => {
            for rules in state.chains.values_mut() {
                rules.clear();
            }
            Ok(())
        }
    });
}

fn append(rest: &[String]) {
    let (chain, rule) = match rest.split_first() {
        Some((c, r)) => (c.clone(), r.join(" ")),
        None => fail("iptables: missing chain for -A"),
    };
    with_state(|state| {
        if !state.chain_exists(&chain) {
            return Err("iptables: No chain/target/match by that name.".to_string());
        }
        state.chains.entry(chain).or_default().push(rule);
        Ok(())
    });
}

fn insert(rest: &[String]) {
    let chain = match rest.first() {
        Some(c) => c.clone(),
        None => fail("iptables: missing chain for -I"),
    };
    // `-I <chain> [pos] <rule...>`: the position is optional and defaults to 1.
    let (position, rule_tokens) = match rest.get(1).and_then(|t| t.parse::<usize>().ok()) {
        Some(pos) => (pos.max(1), &rest[2..]),
        None => (1, &rest[1..]),
    };
    let rule = rule_tokens.join(" ");
    with_state(|state| {
        if !state.chain_exists(&chain) {
            return Err("iptables: No chain/target/match by that name.".to_string());
        }
        let rules = state.chains.entry(chain).or_default();
        let idx = (position - 1).min(rules.len());
        rules.insert(idx, rule);
        Ok(())
    });
}

fn delete(rest: &[String]) {
    let (chain, rule) = match rest.split_first() {
        Some((c, r)) => (c.clone(), r.join(" ")),
        None => fail("iptables: missing chain for -D"),
    };
    with_state(|state| {
        let rules = match state.chains.get_mut(&chain) {
            Some(r) => r,
            None => return Err("iptables: No chain/target/match by that name.".to_string()),
        };
        match rules.iter().position(|r| r == &rule) {
            Some(idx) => {
                rules.remove(idx);
                Ok(())
            }
            None => {
                Err("iptables: Bad rule (does a matching rule exist in that chain?).".to_string())
            }
        }
    });
}
