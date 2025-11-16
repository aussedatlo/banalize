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

- **Database:** sled - persistent storage for current bans/matches. is used in the critical path.  the file that operate sled operations should not contains any business logic, only sled operations. a cleanup task will clean old bans/matches from this database periodically

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

init:
Calls create_chain() → creates a new iptables chain banalize. If it already exists, it ignores the error.

Calls link_chain() → inserts a jump from the main chain (INPUT by default) to your custom chain.

Calls flush_chain() → clears any existing rules in your custom chain.

After init(), the firewall is ready to accept rules like deny_ip_sync().

cleanup:
Calls flush_chain() → removes all rules from the banalize chain.

Calls unlink_chain() → removes the jump from INPUT (or your link chain) to banalize.

Calls delete_chain() → deletes the banalize chain itself.
    

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
