# Pesawise — start the whole stack in Docker with one command.
# Usage:  ./run.ps1
Write-Host "Starting Pesawise (Postgres + API + Web) in Docker..." -ForegroundColor Green
docker compose up --build
