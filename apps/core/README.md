# Banalize Core

A high-performance Rust backend service that monitors log sources, detects malicious patterns via regex, and automatically applies firewall bans when configurable threshold conditions are met.

## Features

- **Multi-Config Management**: Manages multiple watcher configurations concurrently
- **High-Performance File Watching**: Uses linemux for efficient log tailing
- **Automatic Banning**: Applies iptables rules when match thresholds are exceeded
- **gRPC API**: Provides gRPC endpoints for config management and control
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
- `BANALIZE_CORE_GRPC_ADDR`: gRPC server address - default: 0.0.0.0:50051
- `BANALIZE_CORE_API_FIREWALL_CHAIN`: iptables chain to link to - default: INPUT

## gRPC API

The service provides the following gRPC endpoints:

- `AddConfig`: Create a new configuration and start its watcher
- `EditConfig`: Modify an existing configuration
- `Unban`: Manually remove a ban before expiration
- `Ping`: Health check
- `ListConfig`: List all configurations and their runtime state

See `packages/grpc-types/proto/banalize.proto` for detailed API definitions.

## Database

Uses Sled database stored in `/tmp/banalize-core/` with the following key formats:

- Matches: `match:<config_id>:<ip>:<timestamp>`
- Bans: `ban:<ip>:<timestamp>`

## Architecture

- **Config Manager**: Stores and manages configurations in memory
- **Watcher Manager**: Spawns and manages file watcher tasks per config
- **Database**: Stores matches and bans with efficient key-based lookups
- **Firewall**: Manages iptables rules for IP banning
- **Cleaner**: Background task that removes expired entries
- **Event Emitter**: Asynchronously emits events (non-blocking)

