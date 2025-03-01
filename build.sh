#!/bin/bash
firstArg="$0"
echo $firstArg
docker build -t registry.digitalocean.com/raven-station/nibss/raven-warble:"${firstArg:-latest}" . &&
docker push  registry.digitalocean.com/raven-station/nibss/raven-warble:"${firstArg:-latest}"