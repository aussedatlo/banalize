# Banalize

Banalize is a security-focused tool similar to Fail2Ban, designed to monitor logs (including Docker logs and files) and apply IP bans based on regex rules. This monorepo manages its development, packaging, and deployment.

## Features

- **Regex-based IP banning**: Define custom patterns to detect and block malicious activity.
- **Log Monitoring**: Observe logs from both Docker containers and local files.
- **Automated Ban Management**: Automatically blocks detected IPs based on predefined rules.
- **Performance Optimized**: Utilizes efficient logging and processing mechanisms for minimal overhead.

## Installation

Ensure you have [pnpm](https://pnpm.io/) installed:

```sh
npm install -g pnpm
```

Then, clone the repository and install dependencies:

```sh
git clone https://github.com/your-username/banalize.git
cd banalize
pnpm install
```

## Usage

### Starting Banalize

#### Using Docker Compose

To start Banalize with Docker Compose, run:

```sh
docker compose up -d
```

#### Running from Source

Run the following commands:

```sh
pnpm build
pnpm docker:mongodb
# Open a new shell
pnpm start
```

## Development

### Setting Up Environment Variables

Create `.env` files from the provided templates:

```sh
cp apps/api/.env.template apps/api/.env
cp apps/web/.env.template apps/web/.env
```

### Starting MongoDB

Ensure MongoDB is running by executing:

```sh
pnpm docker:mongodb
```

### Running Development Servers

To start both backend and frontend in development mode:

```sh
pnpm dev
```

## Testing

Run tests with:

```sh
pnpm test
```

## Building

### Using Docker Compose

To build the project with Docker Compose:

```sh
docker compose build
```

### Building from Source

To build the project manually:

```sh
pnpm build
```

## License

Banalize is licensed under the MIT License. See the `LICENSE` file for details.
