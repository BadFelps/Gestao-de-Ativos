import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const normalizeBase44Url = (value) => {
  const url = String(value || '').replace(/\/$/, '');
  return !url || url === 'https://api.base44.com' ? 'https://base44.app' : url;
};
const serverUrl = normalizeBase44Url(appBaseUrl);

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token: token || undefined,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl: serverUrl
});
