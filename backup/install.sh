#!/bin/bash
# KD Workshop — Backup Installer
# Sets up a daily auto-backup using macOS launchd.
# Runs at 9am every day. If Mac is off at 9am, runs on next startup.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Check Node.js ─────────────────────────────────────────────────────────────
NODE_PATH="$(which node 2>/dev/null || true)"
if [ -z "$NODE_PATH" ]; then
  # Try common Homebrew paths
  for p in /opt/homebrew/bin/node /usr/local/bin/node; do
    [ -x "$p" ] && NODE_PATH="$p" && break
  done
fi
if [ -z "$NODE_PATH" ]; then
  echo "ERROR: Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
echo "Node.js found: $NODE_PATH"

# ── Check config.json ─────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/config.json" ]; then
  echo ""
  echo "ERROR: config.json not found."
  echo "  Run:  cp \"$SCRIPT_DIR/config.example.json\" \"$SCRIPT_DIR/config.json\""
  echo "  Then open config.json and fill in your KD account email and password."
  exit 1
fi

# ── Create backup folder ──────────────────────────────────────────────────────
BACKUP_DIR="$HOME/Documents/KD-Backups"
mkdir -p "$BACKUP_DIR"

# ── Write launchd plist ───────────────────────────────────────────────────────
PLIST_NAME="com.kingdhorajiya.backup"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_NAME}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_PATH}</string>
    <string>${SCRIPT_DIR}/backup-orders.js</string>
  </array>

  <!-- Run daily at 9:00am -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>    <integer>9</integer>
    <key>Minute</key>  <integer>0</integer>
  </dict>

  <!-- Also run immediately when Mac starts up (catches missed days) -->
  <key>RunAtLoad</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${BACKUP_DIR}/backup.log</string>
  <key>StandardErrorPath</key>
  <string>${BACKUP_DIR}/backup.log</string>
</dict>
</plist>
PLIST

# ── Load the job ──────────────────────────────────────────────────────────────
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load   "$PLIST_PATH"

echo ""
echo "✓ Daily backup installed and active."
echo ""
echo "  Schedule : Every day at 9:00am"
echo "  Startup  : Also runs on every Mac startup (catches missed days)"
echo "  Saves to : $BACKUP_DIR/YYYY-MM/"
echo "  Log file : $BACKUP_DIR/backup.log"
echo ""
echo "Running first backup now..."
"$NODE_PATH" "$SCRIPT_DIR/backup-orders.js"
