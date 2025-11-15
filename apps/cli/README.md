# Banalize CLI

Command-line interface for managing the Banalize core service.

## Installation

```bash
pnpm install
pnpm build
```

## Usage

### Global Options

- `-s, --server <address>` - gRPC server address (default: `localhost:50051`)

### Commands

#### Create Configuration

```bash
banalize-cli create \
  --id "config-1" \
  --name "My Config" \
  --param "/var/log/access.log" \
  --regex ".*<IP>.*" \
  --ban-time 3600000 \
  --find-time 600000 \
  --max-matches 3 \
  --ignore-ips "192.168.1.0/24,10.0.0.1"
```

#### Update Configuration

```bash
banalize-cli update --id "config-1" --name "Updated Name" --max-matches 5
```

#### List Configurations

```bash
banalize-cli list
```

#### Listen for Events

```bash
# Listen to all events
banalize-cli listen

# Listen only to match events
banalize-cli listen --match

# Listen only to ban events
banalize-cli listen --ban

# Listen only to unban events
banalize-cli listen --unban
```

#### Ping Server

```bash
banalize-cli ping
```

## Development

```bash
# Run in development mode
pnpm dev

# Build
pnpm build
```

