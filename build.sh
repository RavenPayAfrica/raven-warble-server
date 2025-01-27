#!/bin/bash

docker build -t registry.digitalocean.com/raven-station/coral/feather-coralpay . &&
docker push  registry.digitalocean.com/raven-station/coral/feather-coralpay