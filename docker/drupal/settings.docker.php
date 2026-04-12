<?php
/**
 * Docker local development database settings.
 * Copy to rareimage_back/web/sites/default/settings.local.php
 */
$databases['default']['default'] = [
  'database' => getenv('DRUPAL_DB_NAME') ?: 'drupaldb',
  'username' => getenv('DRUPAL_DB_USER') ?: 'drupal',
  'password' => getenv('DRUPAL_DB_PASS') ?: 'drupal',
  'host' => getenv('DRUPAL_DB_HOST') ?: 'db',
  'port' => getenv('DRUPAL_DB_PORT') ?: '5432',
  'driver' => 'pgsql',
  'namespace' => 'Drupal\\pgsql\\Driver\\Database\\pgsql',
  'autoload' => 'core/modules/pgsql/src/Driver/Database/pgsql/',
  'prefix' => '',
];

$settings['hash_salt'] = 'docker-dev-hash-salt-change-for-production';
$settings['config_sync_directory'] = '../config/sync';
