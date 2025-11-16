# @banalize/grpc-types

gRPC type definitions for Banalize core service.

## Proto Files

- `proto/banalize.proto` - Main service definitions for BanalizeCore and BanalizeEvents

## Building

Generate TypeScript types from proto files:

```bash
pnpm build
```

This will generate TypeScript types in the `dist/` directory.

## Usage

Import the generated types:

```typescript
import type {
  AddConfigRequest,
  AddConfigResponse,
  ConfigStatus,
  Event,
  MatchEvent,
  BanEvent,
  UnbanEvent,
} from "@banalize/grpc-types";
```

## Requirements

- `protoc` (Protocol Buffers compiler) must be installed
- `protoc-gen-ts_proto` plugin is included as a dev dependency

