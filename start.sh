#!/bin/sh
echo "[start] Launching analyser in background..."
node src/analyser.js &

echo "[start] Launching runner in background..."
node src/runner.js &

echo "[start] Launching api..."
node src/api.js
