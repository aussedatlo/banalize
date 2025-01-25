#!/bin/bash

if [ -f .env ]; then
    echo "sourcing .env file"
    export $(grep -v '^#' .env | xargs)
    echo "using environment variables:"
    env | grep BANALIZE_WEB_ | sort
fi

# set default values
export PORT=${BANALIZE_WEB_PORT-3000}
export BANALIZE_WEB_API_SERVER_URL=${BANALIZE_WEB_API_SERVER_URL-http://localhost:5040}

# run next command with all arguments
pnpm exec next $@
