#!/bin/bash
set -e

cd /var/www/html

# Install dependencies if vendor directory is missing
if [ ! -d "vendor" ]; then
  echo "[docker] Installing Composer dependencies..."
  composer install --no-interaction --prefer-dist
fi

# Copy Docker database settings if local settings don't exist
if [ ! -f "web/sites/default/settings.local.php" ]; then
  echo "[docker] Copying Docker database settings..."
  cp /usr/local/share/settings.docker.php web/sites/default/settings.local.php
fi
# Append include for settings.local.php if not already present
if ! grep -q "settings.local.php" web/sites/default/settings.php 2>/dev/null || grep -q "^#.*settings.local.php" web/sites/default/settings.php 2>/dev/null; then
  if ! grep -q "^if (file_exists.*settings.local.php" web/sites/default/settings.php 2>/dev/null; then
    echo "" >> web/sites/default/settings.php
    echo 'if (file_exists($app_root . "/" . $site_path . "/settings.local.php")) {' >> web/sites/default/settings.php
    echo '  include $app_root . "/" . $site_path . "/settings.local.php";' >> web/sites/default/settings.php
    echo '}' >> web/sites/default/settings.php
    echo "[docker] Added settings.local.php include"
  fi
fi

# Ensure files directory exists and is writable
mkdir -p web/sites/default/files
chown -R www-data:www-data web/sites/default/files
chmod -R 775 web/sites/default/files

# Wait for database to be ready
echo "[docker] Waiting for database..."
for i in $(seq 1 30); do
  if pg_isready -h db -p 5432 -U drupal 2>/dev/null; then
    echo "[docker] Database is ready"
    break
  fi
  sleep 1
done

# Check if Drupal is installed
if vendor/bin/drush status --field=bootstrap 2>/dev/null | grep -q "Successful"; then
  echo "[docker] Drupal already installed — clearing caches"
  vendor/bin/drush cr
else
  echo "[docker] Drupal not installed — checking for database dump..."
  if [ -f "/docker-entrypoint-initdb.d/init.sql" ]; then
    echo "[docker] Database seeded from dump — running updatedb"
    vendor/bin/drush updatedb -y 2>/dev/null || true
    vendor/bin/drush cr
  else
    echo "[docker] Fresh install — running site:install"
    vendor/bin/drush site:install standard \
      --db-url=pgsql://drupal:drupal@db:5432/drupaldb \
      --account-name=admin \
      --account-pass=admin \
      --site-name="RareImagery Dev" \
      -y
    # Import config if available
    if [ -d "config/sync" ] && [ "$(ls -A config/sync 2>/dev/null)" ]; then
      echo "[docker] Importing config..."
      vendor/bin/drush config:import -y 2>/dev/null || true
    fi
  fi
fi

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
echo "[docker] Starting Nginx on :8080"
nginx -g 'daemon off;'
