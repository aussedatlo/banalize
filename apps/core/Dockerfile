FROM rust:1.91.0 as builder

WORKDIR /usr/src/app

# Install build dependencies (iptables and protobuf compiler)
RUN apt update && apt install -y iptables protobuf-compiler && rm -rf /var/lib/apt/lists/*

# Copy workspace Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy core app source
COPY apps/core ./apps/core

# Copy proto files needed for build
COPY packages/grpc-types/proto ./packages/grpc-types/proto

# Build the release binary
WORKDIR /usr/src/app
RUN cargo build --release --package banalize-core

# Runtime stage - use newer Debian to match GLIBC version from builder
FROM debian:trixie-slim

WORKDIR /usr/src/app

# Install iptables (required for firewall functionality)
RUN apt update && apt install -y iptables && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder
COPY --from=builder /usr/src/app/target/release/banalize-core /usr/local/bin/banalize-core

# Copy entrypoint script
COPY apps/core/bin/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]

