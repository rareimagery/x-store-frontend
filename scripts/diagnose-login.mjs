/**
 * Login Diagnostics Script
 * 
 * Checks environment variables and connectivity to ensure login is likely to work.
 */

import http from 'http';

const checkEnv = () => {
  const vars = [
    'X_CLIENT_ID',
    'X_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DRUPAL_API_URL'
  ];

  console.log('--- Environment Check ---');
  vars.forEach(v => {
    const val = process.env[v];
    if (val) {
      if (v.includes('SECRET') || v.includes('ID')) {
        console.log(`[PASS] ${v} is set (hidden)`);
      } else {
        console.log(`[PASS] ${v} is set to: ${val}`);
      }
    } else {
      console.log(`[FAIL] ${v} is NOT set`);
    }
  });
  console.log('');
};

const checkDrupal = async (url) => {
  console.log(`--- Drupal Connectivity Check (${url}) ---`);
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        console.log(`[PASS] Drupal is reachable (HTTP ${res.statusCode})`);
        resolve(true);
      });

      req.on('error', (err) => {
        console.log(`[FAIL] Drupal unreachable: ${err.message}`);
        resolve(false);
      });

      req.setTimeout(5000, () => {
        console.log('[FAIL] Drupal connection timed out');
        req.destroy();
        resolve(false);
      });
    } catch (err) {
      console.log(`[FAIL] Error during Drupal check: ${err.message}`);
      resolve(false);
    }
  });
};

const run = async () => {
  checkEnv();
  const drupalUrl = process.env.DRUPAL_API_URL || 'http://localhost:8081';
  await checkDrupal(drupalUrl);

  console.log('\n--- Next Steps ---');
  console.log('1. Ensure X OAuth Callback URL is set to:');
  console.log(`   ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/twitter`);
  console.log('2. Ensure X Developer Portal app has "OAuth 2.0" enabled.');
  console.log('3. Ensure Drupal JSON:API module is enabled.');
};

run().catch(err => console.error(err));
