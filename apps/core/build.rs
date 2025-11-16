fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(
            &["../../packages/grpc-types/proto/banalize.proto"],
            &["../../packages/grpc-types/proto"],
        )?;
    Ok(())
}

