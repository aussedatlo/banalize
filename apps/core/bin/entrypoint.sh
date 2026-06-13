#!/bin/bash

# use the docker environment
env | grep BANALIZE_CORE > /tmp/banalize-core.env || true

echo "using the following environment variables:"
cat /tmp/banalize-core.env || echo "No BANALIZE_CORE environment variables set"

exec /usr/local/bin/banalize-core

