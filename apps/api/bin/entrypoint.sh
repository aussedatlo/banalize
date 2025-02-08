#!/bin/bash

# use the docker environment
env | grep BANALIZE_API > apps/api/.env

echo "using the following environment variables:"
cat apps/api/.env

exec node apps/api/dist/src/main.js