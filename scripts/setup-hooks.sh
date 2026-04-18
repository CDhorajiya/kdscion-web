#!/bin/bash
# Run once after cloning: bash scripts/setup-hooks.sh
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Git hooks installed."
