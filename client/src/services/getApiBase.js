export function getApiBase() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) return configuredUrl;

  const hostname = window.location.hostname;

  if (hostname.startsWith('recomeco-git-') && hostname.endsWith('.vercel.app')) {
    return 'https://recomeco-api-git-' + hostname.substring('recomeco-git-'.length);
  }

  return 'https://recomeco-server.vercel.app';
}
