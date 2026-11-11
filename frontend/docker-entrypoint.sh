#!/bin/sh
set -eu
cat > /usr/share/nginx/html/assets/env.js <<EOF
globalThis.env = { API_URL: "${API_URL:-http://localhost:8080}", MOCK_API: "${MOCK_API:-true}" === "true" };
EOF
