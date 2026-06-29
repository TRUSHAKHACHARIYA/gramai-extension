// GramAI license validation

const DEMO_KEYS = {
  'GRAMAI-PRO-DEMO-2026': { tier: 'pro', expiresAt: null },
  'GRAMAI-TEAM-DEMO-2026': { tier: 'team', expiresAt: null },
};

async function getLicenseInfo() {
  const data = await chrome.storage.sync.get({
    gramai_license_key: '',
    gramai_tier: 'free',
    gramai_license_email: '',
    gramai_license_expires: null,
    gramai_team_id: '',
    gramai_team_role: '',
    gramai_api_key: '',
  });
  return data;
}

async function getUserTier() {
  const info = await getLicenseInfo();
  return info.gramai_tier || 'free';
}

async function validateLicenseKey(key, cloudUrl) {
  const trimmed = (key || '').trim().toUpperCase();

  if (DEMO_KEYS[trimmed]) {
    const demo = DEMO_KEYS[trimmed];
    return {
      valid: true,
      tier: demo.tier,
      email: 'demo@gramai.local',
      expiresAt: demo.expiresAt,
      teamId: demo.tier === 'team' ? 'team-demo-001' : '',
      teamRole: demo.tier === 'team' ? 'admin' : '',
    };
  }

  if (!cloudUrl) {
    throw new Error('Cloud API URL required to validate license keys');
  }

  const base = cloudUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/v1/license/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: trimmed }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid license key');
  }

  return res.json();
}

async function activateLicense(key, cloudUrl) {
  const result = await validateLicenseKey(key, cloudUrl);
  if (!result.valid) throw new Error('Invalid license key');

  await chrome.storage.sync.set({
    gramai_license_key: key.trim().toUpperCase(),
    gramai_tier: result.tier || 'pro',
    gramai_license_email: result.email || '',
    gramai_license_expires: result.expiresAt || null,
    gramai_team_id: result.teamId || '',
    gramai_team_role: result.teamRole || '',
  });

  return result;
}

async function deactivateLicense() {
  await chrome.storage.sync.set({
    gramai_license_key: '',
    gramai_tier: 'free',
    gramai_license_email: '',
    gramai_license_expires: null,
    gramai_team_id: '',
    gramai_team_role: '',
    gramai_api_key: '',
  });
}

self.GramAILicense = { getLicenseInfo, getUserTier, validateLicenseKey, activateLicense, deactivateLicense, DEMO_KEYS };
