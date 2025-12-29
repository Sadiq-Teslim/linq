#!/bin/bash
# Setup cron jobs for LINQ background tasks
# Run this script to set up automated data fetching

# Get the absolute path to the backend-api directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_PATH=$(which python3 || which python)

echo "Setting up LINQ cron jobs..."
echo "Backend directory: $BACKEND_DIR"
echo "Python path: $PYTHON_PATH"

# Create logs directory if it doesn't exist
mkdir -p "$BACKEND_DIR/logs"

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Get existing crontab (if any)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Remove any existing LINQ cron jobs
sed -i '/# LINQ Background Jobs/d' "$TEMP_CRON"
sed -i '/refresh_companies_cron.py/d' "$TEMP_CRON"
sed -i '/refresh_feed_cron.py/d' "$TEMP_CRON"

# Add new cron jobs
cat >> "$TEMP_CRON" << EOF

# LINQ Background Jobs
# Refresh all tracked companies every 12 hours (at 00:00 and 12:00 UTC)
0 0,12 * * * cd "$BACKEND_DIR" && $PYTHON_PATH scripts/refresh_companies_cron.py >> logs/refresh_companies.log 2>&1

# Refresh industry feed every 6 hours
0 */6 * * * cd "$BACKEND_DIR" && $PYTHON_PATH scripts/refresh_feed_cron.py >> logs/refresh_feed.log 2>&1
EOF

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✓ Cron jobs installed successfully!"
echo ""
echo "Current crontab:"
crontab -l | grep -A 5 "LINQ Background Jobs"
echo ""
echo "To view logs:"
echo "  tail -f $BACKEND_DIR/logs/refresh_companies.log"
echo "  tail -f $BACKEND_DIR/logs/refresh_feed.log"

