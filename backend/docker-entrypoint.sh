#!/bin/sh
# Entry point for the Pesawise API container.
# Migrations own the schema (synchronize is off). We apply any pending
# migrations first, then seed the demo personas ONCE (the seed skips itself if
# the users table is already populated), then start the API.
set -e

echo "🗄️  Running database migrations…"
node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js \
  || echo "⚠️  Migration step failed — continuing to boot (schema may already exist; reconcile with a baseline fake-apply, see DEPLOY.md)."

if [ "${AUTO_SEED:-true}" = "true" ]; then
  echo "🌱 Seeding demo personas (skips if data already exists)…"
  SEED_SKIP_IF_EXISTS=true node dist/database/seed.js || echo "⚠️  Seed step failed — continuing to boot the API."
fi

echo "🚀 Starting Pesawise API…"
exec node dist/main.js
