// GramAI tier definitions and feature gating

const GRAMAI_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
};

const PRO_FEATURES = new Set([
  'cloud',
  'realtime',
  'unlimited_history',
  'custom_prompts',
  'autoscore',
]);

const TEAM_FEATURES = new Set([
  'style_guides',
  'team_vocabulary',
  'admin_dashboard',
  'api_access',
]);

function hasTierAccess(userTier, requiredTier) {
  const order = { free: 0, pro: 1, team: 2 };
  return (order[userTier] || 0) >= (order[requiredTier] || 0);
}

function canUseFeature(userTier, feature) {
  if (TEAM_FEATURES.has(feature)) return userTier === GRAMAI_TIERS.TEAM;
  if (PRO_FEATURES.has(feature)) return hasTierAccess(userTier, GRAMAI_TIERS.PRO);
  return true;
}

function getTierLabel(tier) {
  return { free: 'Free', pro: 'Pro', team: 'Team' }[tier] || 'Free';
}

const GramAITier = { GRAMAI_TIERS, PRO_FEATURES, TEAM_FEATURES, hasTierAccess, canUseFeature, getTierLabel };

if (typeof self !== 'undefined') self.GramAITier = GramAITier;
if (typeof window !== 'undefined') window.GramAITier = GramAITier;
