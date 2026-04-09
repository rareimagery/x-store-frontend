#!/bin/bash
# Sets up cron jobs to replace Vercel cron
# Run on VPS: bash deploy/setup-crons.sh

CRON_SECRET="${CRON_SECRET:-$(grep CRON_SECRET /var/www/rareimagery/.env.production 2>/dev/null | cut -d= -f2)}"

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: Set CRON_SECRET in .env.production first"
  exit 1
fi

# Write crontab entries
CRON_JOBS=$(cat <<EOF
# RareImagery Cron Jobs (replaces Vercel crons)
# Code audit — every 6 hours
0 */6 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/code-audit > /dev/null 2>&1

# Wiki update — every 2 hours
0 */2 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/wiki-update > /dev/null 2>&1

# X Money watcher — twice daily (6am, 6pm UTC)
0 6,18 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/x-money-watcher > /dev/null 2>&1
EOF
)

# Append to user's crontab (preserving existing entries)
(crontab -l 2>/dev/null | grep -v "rareimagery\|code-audit\|wiki-update\|x-money-watcher"; echo "$CRON_JOBS") | crontab -

echo "Cron jobs installed:"
crontab -l | grep rareimagery
echo ""
echo "Done. Crons will hit http://127.0.0.1:3000/api/cron/* with Bearer auth."
