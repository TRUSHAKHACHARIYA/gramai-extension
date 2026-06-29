// GramAI Cloud API client

const DEFAULT_CLOUD_URL = 'http://localhost:3847';

async function getCloudConfig() {
  const data = await chrome.storage.sync.get({
    gramai_mode: 'local',
    gramai_cloud_url: DEFAULT_CLOUD_URL,
    gramai_license_key: '',
    gramai_api_key: '',
  });
  return data;
}

async function processWithCloud(action, text, extra, prompt) {
  const config = await getCloudConfig();
  const base = (config.gramai_cloud_url || DEFAULT_CLOUD_URL).replace(/\/$/, '');

  const headers = { 'Content-Type': 'application/json' };
  if (config.gramai_api_key) {
    headers['X-API-Key'] = config.gramai_api_key;
  } else if (config.gramai_license_key) {
    headers['X-License-Key'] = config.gramai_license_key;
  }

  const res = await fetch(`${base}/v1/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, text, extra, prompt }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Cloud API error (${res.status})`);
  }

  const data = await res.json();
  return (data.result || data.response || '').trim();
}

async function checkCloudStatus() {
  const config = await getCloudConfig();
  const base = (config.gramai_cloud_url || DEFAULT_CLOUD_URL).replace(/\/$/, '');
  const res = await fetch(`${base}/v1/health`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error('Cloud API unavailable');
  return res.json();
}

async function fetchTeamStyleGuides() {
  const config = await getCloudConfig();
  const base = (config.gramai_cloud_url || DEFAULT_CLOUD_URL).replace(/\/$/, '');
  const teamId = (await chrome.storage.sync.get({ gramai_team_id: '' })).gramai_team_id;
  if (!teamId) return [];

  const headers = { 'X-License-Key': config.gramai_license_key };
  const res = await fetch(`${base}/v1/team/${teamId}/style-guides`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.guides || [];
}

async function syncStyleGuideToCloud(guide) {
  const config = await getCloudConfig();
  const base = (config.gramai_cloud_url || DEFAULT_CLOUD_URL).replace(/\/$/, '');
  const teamId = (await chrome.storage.sync.get({ gramai_team_id: '' })).gramai_team_id;
  if (!teamId) throw new Error('No team ID — Team license required');

  const res = await fetch(`${base}/v1/team/${teamId}/style-guides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-License-Key': config.gramai_license_key,
    },
    body: JSON.stringify(guide),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Failed to sync style guide');
  return res.json();
}

async function generateApiKey() {
  const config = await getCloudConfig();
  const base = (config.gramai_cloud_url || DEFAULT_CLOUD_URL).replace(/\/$/, '');

  const res = await fetch(`${base}/v1/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-License-Key': config.gramai_license_key,
    },
    body: JSON.stringify({ name: 'Extension' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Failed to generate API key');
  const data = await res.json();
  if (data.apiKey) {
    await chrome.storage.sync.set({ gramai_api_key: data.apiKey });
  }
  return data;
}

self.GramAICloud = {
  DEFAULT_CLOUD_URL,
  getCloudConfig,
  processWithCloud,
  checkCloudStatus,
  fetchTeamStyleGuides,
  syncStyleGuideToCloud,
  generateApiKey,
};
