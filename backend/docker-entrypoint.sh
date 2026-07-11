#!/bin/sh
# Entry point for the Pesawise API container.
# TypeORM `synchronize:true` creates the schema; the seed then loads the demo
# personas ONCE (it skips itself if the users table is already populated).
set -e

if [ "${AUTO_SEED:-true}" = "true" ]; then
  echo "🌱 Seeding demo personas (skips if data already exists)…"
  SEED_SKIP_IF_EXISTS=true node dist/database/seed.js || echo "⚠️  Seed step failed — continuing to boot the API."
fi

echo "🚀 Starting Pesawise API…"
exec node dist/main.js
