#!/bin/bash

# use the docker environment
env | grep BANALIZE_WEB > apps/web/.env

echo "using the following environment variables:"
cat apps/web/.env

export PORT=$BANALIZE_WEB_PORT
export HOSTNAME=0.0.0.0

# copy sources in another folder to avoid conflicts with the environment variables
cp -r apps/web apps/web-copy

# replace dummy url with the real one in all files inside apps/web-copy folder
DUMMY="http://replace-me-with-the-api-server-url:6040"
REAL="$BANALIZE_WEB_API_SERVER_URL"
grep -rl $DUMMY apps/web-copy | xargs sed -i "s|$DUMMY|$REAL|g"

# start the server
exec node apps/web-copy/server.js
 