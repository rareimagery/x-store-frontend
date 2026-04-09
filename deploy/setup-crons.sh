#!/bin/bash
# Sets up cron jobs for VPS (replaces Vercel cron)
# Run on VPS: bash deploy/setup-crons.sh

CRON_SECRET="${CRON_SECRET:-$(grep CRON_SECRET /var/www/rareimagery/.env.production 2>/dev/null | cut -d= -f2)}"

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: Set CRON_SECRET in .env.production first"
  exit 1
fi

# Write crontab entries — 5 consolidated agents
CRON_JOBS=$(cat <<EOF
# RareImagery Cron Agents (VPS)

# Code audit — every 6 hours (master health check)
0 */6 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/code-audit > /dev/null 2>&1

# Wiki update — every 4 hours (probe endpoints, rebuild wiki)
0 */4 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/wiki-update > /dev/null 2>&1

# X Money watcher — twice daily 6am/6pm UTC
0 6,18 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/x-money-watcher > /dev/null 2>&1

# API agent — every 6 hours offset (token health + Drupal batch sync)
0 1,7,13,19 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/api-agent > /dev/null 2>&1

# Frontend agent — every 6 hours offset (store page checks + revalidation)
0 2,8,14,20 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/frontend-agent > /dev/null 2>&1
EOF
)

# Append to user's crontab (preserving existing non-rareimagery entries)
(crontab -l 2>/dev/null | grep -v "rareimagery\|code-audit\|wiki-update\|x-money-watcher\|api-agent\|frontend-agent"; echo "$CRON_JOBS") | crontab -

echo "Cron jobs installed:"
crontab -l | grep -A1 "RareImagery"
echo ""
echo "Schedule:"
echo "  code-audit:      0, 6, 12, 18 UTC"
echo "  wiki-update:     0, 4, 8, 12, 16, 20 UTC"
echo "  x-money-watcher: 6, 18 UTC"
echo "  api-agent:       1, 7, 13, 19 UTC"
echo "  frontend-agent:  2, 8, 14, 20 UTC"
echo ""
echo "Done."
