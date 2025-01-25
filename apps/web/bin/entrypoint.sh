#!/bin/bash

echo "environment variables from build:"
cat .env | grep BANALIZE_WEB_ | sort

echo "environment variables from docker:"
env | grep BANALIZE_WEB_ | sort

export PORT=$BANALIZE_WEB_PORT
export HOSTNAME=0.0.0.0

# start the server
node apps/web/server.js
 