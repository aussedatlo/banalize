FROM rust:1.91.0 as builder

WORKDIR /usr/src/app

# Install build dependencies (iptables)
RUN apt update && apt install -y iptables && rm -rf /var/lib/apt/lists/*

# Copy workspace and core manifests only
COPY Cargo.toml Cargo.lock ./
COPY apps/core/Cargo.toml ./apps/core/Cargo.toml

# Build dependencies against stub binaries so this layer only rebuilds when the
# manifests or lockfile change, not on every source edit
RUN mkdir -p apps/core/src/bin \
    && echo 'fn main() {}' > apps/core/src/main.rs \
    && echo 'fn main() {}' > apps/core/src/bin/fake_iptables.rs \
    && cargo build --release --package banalize-core \
    && rm -rf apps/core/src

# Copy core app source
COPY apps/core ./apps/core

# Build the release binary (touch so cargo doesn't reuse the stub builds)
RUN touch apps/core/src/main.rs apps/core/src/bin/fake_iptables.rs \
    && cargo build --release --package banalize-core

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

