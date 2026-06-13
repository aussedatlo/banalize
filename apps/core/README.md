# Banalize Core

A high-performance Rust backend service that monitors log sources, detects malicious patterns via regex, and automatically applies firewall bans when configurable threshold conditions are met.

## Features

- **Multi-Config Management**: Manages multiple watcher configurations concurrently
- **High-Performance File Watching**: Uses linemux for efficient log tailing
- **Automatic Banning**: Applies iptables rules when match thresholds are exceeded
- **Background Cleaner**: Automatically removes expired matches and bans
- **Event Emission**: Asynchronously emits match/ban/unban events

## Usage

### Build

```bash
cargo build --release
```

### Run

```bash
./target/release/banalize-core
```

### Environment Variables

- `BANALIZE_CORE_LOG_LEVEL`: Log level (INFO, DEBUG, ERROR) - default: INFO
- `BANALIZE_CORE_FIREWALL_CHAIN`: iptables chain to link to - default: INPUT
- `BANALIZE_CORE_DATABASE_PATH`: Base path for database storage - default: `/tmp/banalize-core`
- `BANALIZE_CORE_API_ADDR`: Address and port for the REST API server - default: `0.0.0.0:5040`

## REST API

The application exposes a REST API for managing configurations:

### Endpoints

- `GET /api/configs` - List all configurations
- `GET /api/configs/:id` - Get a specific configuration by ID
- `POST /api/configs` - Create a new configuration
- `PUT /api/configs/:id` - Update an existing configuration
- `DELETE /api/configs/:id` - Delete a configuration

### Example Requests

**Create a config:**
```bash
curl -X POST http://localhost:5040/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ssh-failed-login",
    "name": "SSH Failed Login",
    "param": "auth.log",
    "regex": "Failed password for.*from ([0-9.]+)",
    "ban_time": 3600,
    "find_time": 600,
    "max_matches": 5,
    "ignore_ips": []
  }'
```

**Update a config:**
```bash
curl -X PUT http://localhost:5040/api/configs/ssh-failed-login \
  -H "Content-Type: application/json" \
  -d '{
    "ban_time": 7200,
    "max_matches": 3
  }'
```

**Delete a config:**
```bash
curl -X DELETE http://localhost:5040/api/configs/ssh-failed-login
```

## Database

Uses three databases:

- **Sled database**: Stored in the path specified by `BANALIZE_CORE_DATABASE_PATH` (default: `/tmp/banalize-core/`) with the following key formats:
  - Matches: `match:<config_id>:<ip>:<timestamp>`
  - Bans: `ban:<config_id>:<ip>:<timestamp>`

- **SQLite events database**: Stored at `<BANALIZE_CORE_DATABASE_PATH>/events.db` (default: `/tmp/banalize-core/events.db`)
  - Stores match events, ban events, and unban events

- **SQLite configs database**: Stored at `<BANALIZE_CORE_DATABASE_PATH>/configs.db` (default: `/tmp/banalize-core/configs.db`)
  - Stores all configuration data

## Architecture

- **Config Manager**: Stores and manages configurations in memory
- **Watcher Manager**: Spawns and manages file watcher tasks per config
- **Database**: Stores matches and bans with efficient key-based lookups
- **Firewall**: Manages iptables rules for IP banning
- **Cleaner**: Background task that removes expired entries
- **Event Emitter**: Asynchronously emits events (non-blocking)

