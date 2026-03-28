/**
 * Login Diagnostics Script
 * 
 * Checks environment variables and connectivity to ensure login is likely to work.
 */

const checkEnv = () => {
  const vars = [
    'X_CLIENT_ID',
    'X_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DRUPAL_API_URL'
  ];

  console.log('--- Environment Check ---');
  let allPass = true;
  vars.forEach(v => {
    const val = process.env[v];
    if (val && val.trim() !== '') {
      if (v.includes('SECRET') || v.includes('ID')) {
        console.log(`[PASS] ${v} is set (length: ${val.length})`);
      } else {
        console.log(`[PASS] ${v} is set to: ${val}`);
      }
    } else {
      console.log(`[FAIL] ${v} is NOT set or empty`);
      allPass = false;
    }
  });

  if (process.env.X_CLIENT_ID && process.env.X_CLIENT_ID === process.env.X_CLIENT_SECRET) {
    console.log('[FAIL] X_CLIENT_ID and X_CLIENT_SECRET are identical! This is a common misconfiguration.');
    allPass = false;
  }

  console.log('');
  return allPass;
};

const checkDrupal = async (url) => {
  console.log(`--- Drupal Connectivity Check (${url}) ---`);
  try {
    const res = await fetch(url + '/user/login?_format=json', {
      method: 'GET',
    });
    console.log(`[PASS] Drupal is reachable (HTTP ${res.status})`);
    if (res.status === 404) {
      console.log('[WARN] /user/login?_format=json returned 404. Is the REST UI/JSON:API enabled?');
    }
    return true;
  } catch (err) {
    console.log(`[FAIL] Drupal unreachable: ${err.message}`);
    return false;
  }
};

const run = async () => {
  checkEnv();
  const drupalUrl = process.env.DRUPAL_API_URL || 'http://72.62.80.155:32778';
  await checkDrupal(drupalUrl);

  console.log('\n--- Next Steps ---');
  console.log('1. Ensure X OAuth Callback URL is set to:');
  console.log(`   ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/twitter`);
  console.log('2. Ensure X Developer Portal app has "OAuth 2.0" enabled.');
  console.log('3. Ensure Drupal JSON:API module is enabled.');
};

run().catch(err => console.error(err));
