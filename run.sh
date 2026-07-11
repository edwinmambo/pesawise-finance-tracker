#!/bin/sh
# Pesawise — start the whole stack in Docker with one command.
# Usage:  ./run.sh
echo "Starting Pesawise (Postgres + API + Web) in Docker..."
exec docker compose up --build
