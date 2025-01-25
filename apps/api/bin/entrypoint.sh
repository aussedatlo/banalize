#!/bin/bash

# use the docker environment
env | grep BANALIZE_API > apps/api/.env

echo "using the following environment variables:"
cat apps/api/.env

node apps/api/dist/main.js