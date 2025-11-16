import type {
  BanalizeCoreClient,
  BanalizeEventsClient,
} from "@banalize/grpc-types";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve proto path relative to workspace root
// When running from src: ../../../../packages/grpc-types/proto/banalize.proto
// When running from dist: ../../../packages/grpc-types/proto/banalize.proto
const PROTO_PATH = join(
  __dirname,
  __dirname.includes("/dist/")
    ? "../../../packages/grpc-types/proto/banalize.proto"
    : "../../../../packages/grpc-types/proto/banalize.proto",
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = grpc.loadPackageDefinition(packageDefinition) as any;

export function createCoreClient(address: string): BanalizeCoreClient {
  return new proto.banalize.BanalizeCore(
    address,
    grpc.credentials.createInsecure(),
  ) as BanalizeCoreClient;
}

export function createEventsClient(address: string): BanalizeEventsClient {
  return new proto.banalize.BanalizeEvents(
    address,
    grpc.credentials.createInsecure(),
  ) as BanalizeEventsClient;
}
