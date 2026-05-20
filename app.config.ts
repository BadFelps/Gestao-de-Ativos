const normalizeBase44Url = (value) => {
  const url = String(value || '').replace(/\/$/, '');
  return !url || url === 'https://api.base44.com' ? 'https://base44.app' : url;
};

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    base44AppId:
      process.env.EXPO_PUBLIC_BASE44_APP_ID ||
      process.env.VITE_BASE44_APP_ID ||
      '69b984ecbe7402af99e141a5',
    base44AppBaseUrl:
      normalizeBase44Url(
        process.env.EXPO_PUBLIC_BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL
      ),
    base44FunctionsVersion:
      process.env.EXPO_PUBLIC_BASE44_FUNCTIONS_VERSION || process.env.VITE_BASE44_FUNCTIONS_VERSION || 'v3'
  }
});
