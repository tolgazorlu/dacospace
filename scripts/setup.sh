#!/usr/bin/env bash
# One-time setup for dacospace + java-scale-lab. Safe to run again.
#   pnpm run setup
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
LAB="${DACOSPACE_LAB_DIR:-$(cd .. && pwd)/java-scale-lab}"
LAB_REPO="${LAB_REPO:-https://github.com/tolgazorlu/java-scale-lab.git}"
AI_LAB="${DACOSPACE_AI_LAB_DIR:-$(cd .. && pwd)/ai-systems-lab}"
AI_LAB_REPO="${AI_LAB_REPO:-https://github.com/tolgazorlu/ai-systems-lab.git}"

ok()   { printf '  ok    %s\n' "$*"; }
miss() { printf '  MISSING  %s\n' "$*"; FAILED=1; }
FAILED=0

echo "Checking tools"
command -v node >/dev/null && ok "node $(node -v)" || miss "Node.js 20+ (https://nodejs.org)"
command -v pnpm >/dev/null && ok "pnpm $(pnpm -v)" || miss "pnpm (corepack enable)"
command -v git >/dev/null && ok "git" || miss "git"
command -v python3 >/dev/null && ok "python3" || miss "python3 (the lab CLI uses it for reports)"
if command -v docker >/dev/null; then
  if docker info >/dev/null 2>&1; then ok "docker (running)"; else miss "Docker is installed but not running. Start Docker Desktop."; fi
else miss "Docker Desktop (https://docker.com)"; fi
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/}java"
[ -x "$HOME/.sdkman/candidates/java/current/bin/java" ] && JAVA_BIN="$HOME/.sdkman/candidates/java/current/bin/java"
if JV=$("$JAVA_BIN" -version 2>&1 | head -1); then
  MAJOR=$(echo "$JV" | sed -E 's/.*version "([0-9]+).*/\1/')
  if [ "${MAJOR:-0}" -ge 25 ] 2>/dev/null; then ok "java $MAJOR"; else miss "Java 25+ (found: $JV). Easiest: sdk install java 25-amzn"; fi
else miss "Java 25+ (https://sdkman.io, then: sdk install java 25-amzn)"; fi

echo
echo "java-scale-lab"
if [ -d "$LAB/.git" ]; then ok "found at $LAB"
else
  echo "  cloning $LAB_REPO into $LAB"
  git clone -q "$LAB_REPO" "$LAB" && ok "cloned" || miss "could not clone $LAB_REPO (do you have access?)"
fi

echo
echo "ai-systems-lab"
if [ -d "$AI_LAB/.git" ]; then ok "found at $AI_LAB"
else
  echo "  cloning $AI_LAB_REPO into $AI_LAB"
  git clone -q "$AI_LAB_REPO" "$AI_LAB" && ok "cloned" || miss "could not clone $AI_LAB_REPO (do you have access?)"
fi

echo
echo "dacospace dependencies"
pnpm install --frozen-lockfile --silent && ok "pnpm install"

if [ "$FAILED" = 1 ]; then
  echo
  echo "Fix the MISSING items above and run this again."
  exit 1
fi

if [ -z "${DACOSPACE_SETUP_NO_UP:-}" ]; then
  echo
  echo "Starting the lab infrastructure (first run downloads ~3 GB of images)"
  (cd "$LAB" && ./lab up)
fi

cat <<EOF

Done. Next:
  pnpm build && pnpm start        # http://localhost:4120
  open the Lab tab, press Start next to the app, then Run "./lab seed" in mission 01.

AI mentor (optional), stdio MCP server:
  command: $ROOT/node_modules/.bin/tsx
  args:    $ROOT/mcp/server.mts
EOF
