# **Improved Specification**

## **Objective**

Implement a high-performance Rust backend service that monitors log sources, detects malicious patterns via regex, and automatically applies firewall bans when configurable threshold conditions are met. The critical path—**tail → scan → match → ban → firewall**—must operate with minimum latency.

**Service name:** `banalize-core`  
A long-running daemon providing APIs and managing multiple concurrent watchers.

---

## **Key Principles**

- **Parallelism:**  
   Each configuration runs in its own watcher task. No config should degrade the performance of others. All watchers operate fully independently.
- **Performance isolation:**  
   Regex scanning runs per-line in a shared thread pool. DB operations are queued to avoid blocking IO on the critical path.
- **Minimal persistent data in sled database:**  
   Only essential match + ban records are kept. A background cleaner removes expired entries to maintain fast lookups.
- **Modularity & Extensibility:**
  - Pluggable watcher types (file tail, docker logs, journald, etc.)
  - Pluggable firewall backends (iptables, nftables, cloud firewall API, etc.)
- **timestamp**: all timestamp are in milliseconds

## Critical path description

file watcher detect a line -> regex extract an IP -> add a match in sled db -> emit match event -> verify if needs a ban -> call firewall -> emit ban event

match event: add match in sqlite
ban event: add ban in sqlite

---

## **Tech Stack**

- **Database:** sled - persistent storage for current bans/matches. is used in the critical path. the file that operate sled operations should not contains any business logic, only sled operations. a cleanup task will clean old bans/matches from this database periodically

- Database: sqlite: persistent storage for configs/events, this database is used by the REST API and is populated in a async manner using events from the critical path file watcher.
- **File tailing:** linemux
- **Firewall backend:** iptables (first implementation)

---

## **Database Layout (sled)**

Store only the minimum information required to evaluate bans and support introspection.

### **Match Tree**

```
match:<config_id>:<ip>:<timestamp>
```

- Enables efficient iteration by `(config_id, ip)` prefix
- Timestamp ordering supports quick expiry scanning

### Ban Tree

```
ban:<config_id>:<ip>:<timestamp>
```

- One key per ban event
- Simplifies manual unbans and checking current ban state

### Firewall

Chain layout: `INPUT → banalize (parent) → bnz-<config> (one child chain per config)`.
Every config owns its own child chain so bans never interfere across configs:
the same IP banned by two configs yields two independent rules, and unbanning
one leaves the other intact.

Child chain names come from `chain_name(config_id)`: the id is sanitized to
`[A-Za-z0-9._-]`; ids that needed sanitizing or exceed the 28-char iptables
limit get a truncated prefix plus an FNV-1a hash of the original id, so names
are deterministic across restarts and distinct ids can never collide.

init:
Creates the parent chain `banalize` (ignoring "already exists"), inserts a jump
from the link chain (INPUT by default), and flushes the parent — which also
drops any stale jumps to child chains. Then sweeps orphaned `bnz-*` chains left
by a crashed run (flush + delete; they are unreferenced after the parent
flush). Restore re-creates the chains that are still needed.

runtime:
Deny creates the config's child chain on first use (`-N bnz-<cfg>` + a jump
from the parent) and appends `-s <ip> -j DROP` to it, deduplicating per chain.
Allow deletes that rule. RemoveChain (config deletion) flushes the child chain,
unlinks it from the parent and deletes it — lifting every ban of that config at
once.

cleanup (shutdown):
Flushes the parent (unreferencing the children), flushes and deletes every
child chain, removes the jump from the link chain, then deletes the parent.

### **Cleaning / Expiration**

A background cleaner will:

- Remove match entries older than `find_time` (from their config)
- Remove expired bans older than `ban_time`
- Run periodically (interval configurable)

Goal: keep sled DB small, predictable, and fast for range scans.

## API endpoint

/api/configs GET/POST
/api/configs/:id GET,PUT,DELETE

example config:

```
{
	"id": "config-1",
	"name": "My Config",
	"param": "/tmp/log.txt",
	"regex": ".*<IP>.*",
	"ban_time": 120000,
	"find_time": 60000,
	"max_matches": 3,
	"ignore_ips": [
		"192.168.1.0/24",
		"10.0.0.1"
	]
}
```

`<IP>` should be present and should detect/extract an ip address

/api/matches GET
/api/matches/:config_id

/api/bans GET
/api/bans/:config_id

/api/unbans GET
/api/unbans/:config_id

## Cleanup

should cleanup properly with SIGTERM or SIGINT

```

## Error handling

- invalid config: Return an error and does not create the config/does not start the config watcher
- firewall error: do nothing
```
