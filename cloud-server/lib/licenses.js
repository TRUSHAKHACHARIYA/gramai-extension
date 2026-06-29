const crypto = require('crypto');
const { loadJson, saveJson } = require('./store');

const LICENSES_FILE = 'licenses.json';

const DEFAULT_LICENSES = {
  'GRAMAI-PRO-DEMO-2026': { tier: 'pro', email: 'demo@gramai.local', teamId: null },
  'GRAMAI-TEAM-DEMO-2026': { tier: 'team', email: 'admin@gramai.local', teamId: 'team-demo-001', role: 'admin' },
};

function loadLicenses() {
  return loadJson(LICENSES_FILE, { ...DEFAULT_LICENSES });
}

function saveLicenses(licenses) {
  saveJson(LICENSES_FILE, licenses);
}

function generateLicenseKey(tier) {
  const prefix = tier === 'team' ? 'GRAMAI-TEAM' : 'GRAMAI-PRO';
  const segment = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${segment}-${new Date().getFullYear()}`;
}

function activateLicense(licenses, { key, tier, email, teamId, role }) {
  const licenseKey = key.toUpperCase();
  licenses[licenseKey] = {
    tier,
    email,
    teamId: teamId || null,
    role: role || (tier === 'team' ? 'admin' : undefined),
    activatedAt: new Date().toISOString(),
  };
  saveLicenses(licenses);
  return licenses[licenseKey];
}

module.exports = {
  loadLicenses,
  saveLicenses,
  generateLicenseKey,
  activateLicense,
  DEFAULT_LICENSES,
};
