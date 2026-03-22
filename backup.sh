#!/bin/bash
# CEO AUTOMATED BACKUP SCRIPT
# Runs after every major build phase

set -e

PROJECT_DIR="/root/.openclaw/workspace/Clippy-agent-platform-cb3-new"
LOG_FILE="$PROJECT_DIR/CEO_BUILD_LOG.md"

cd $PROJECT_DIR

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")

# Check for changes
if git diff --quiet HEAD; then
    echo "[$TIMESTAMP] No changes to backup"
    exit 0
fi

# Add all changes
git add -A

# Commit with timestamp and phase
COMMIT_MSG="[$TIMESTAMP] CEO Build Update"
git commit -m "$COMMIT_MSG" --quiet

# Get new hash
NEW_HASH=$(git rev-parse --short HEAD)

# Update log
cat >> $LOG_FILE << EOF

### [$TIMESTAMP] AUTOMATED BACKUP
- Action: CEO build phase complete
- Commit: $NEW_HASH
- Files changed: $(git diff --name-only HEAD~1 | wc -l)
- Status: ✅ Backed up
EOF

echo "[$TIMESTAMP] ✅ Backup complete: $NEW_HASH"
echo "[$TIMESTAMP] Log updated"
