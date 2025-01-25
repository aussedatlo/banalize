#!/bin/bash

# use the docker environment
env | grep BANALIZE_WEB > apps/web/.env

echo "using the following environment variables:"
cat apps/web/.env

export PORT=$BANALIZE_WEB_PORT
export HOSTNAME=0.0.0.0

# copy server files to the right place
cp -rv apps/web/.next/standalone /tmp/
cp -rv apps/web/.next/static /tmp/standalone/apps/web/.next/
cp -rv apps/web/public /tmp/standalone/apps/web/

# start the server
cd /tmp/standalone && node apps/web/server.js
 