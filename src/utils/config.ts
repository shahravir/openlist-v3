import { Capacitor } from '@capacitor/core';

/**
 * Get the API base URL for the current environment
 * 
 * Priority order:
 * 1. VITE_API_URL environment variable (highest priority)
 * 2. Development fallback (localhost) for local development
 * 3. Production fallback (only if VITE_API_URL is not set)
 * 
 * For production deployments (e.g., Vercel), set VITE_API_URL in environment variables.
 * For local development, it will default to localhost if VITE_API_URL is not set.
 */
export function getApiBaseUrl(): string {
  // Priority 1: Check for explicit environment variable (highest priority)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('[Config] Using API URL from environment variable:', envUrl);
    return envUrl;
  }

  // Check if we're running in Capacitor (mobile app)
  const isCapacitor = Capacitor.isNativePlatform();
  
  if (isCapacitor) {
    // For mobile, VITE_API_URL must be set
    const placeholder = 'http://YOUR_LOCAL_IP:3001/api';
    console.error(
      '[Config] ❌ Running in Capacitor but VITE_API_URL not set!\n' +
      'Current URL: ' + placeholder + '\n' +
      'Please rebuild with: VITE_API_URL=http://YOUR_IP:3001/api npm run build\n' +
      'Find your IP with: ipconfig getifaddr en0'
    );
    return placeholder;
  }

  // For web (browser), check if we're in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    // Development fallback: use localhost
    const devUrl = 'http://localhost:3001/api';
    console.log('[Config] Development mode: Using localhost API URL:', devUrl);
    console.log('[Config] To override, set VITE_API_URL environment variable');
    return devUrl;
  }

  // Production fallback (only used if VITE_API_URL is not set)
  // Note: For production deployments, you should set VITE_API_URL in your deployment platform
  const productionUrl = import.meta.env.VITE_API_URL_FALLBACK || 'https://openlist-v3-server.onrender.com/api';
  console.warn(
    '[Config] ⚠️ VITE_API_URL not set in production. Using fallback:',
    productionUrl
  );
  console.warn(
    '[Config] To configure your backend URL, set VITE_API_URL environment variable in your deployment platform (e.g., Vercel)'
  );
  return productionUrl;
}

/**
 * Get the WebSocket URL for the current environment
 * 
 * Priority order:
 * 1. VITE_WS_URL environment variable (highest priority)
 * 2. Auto-derived from API URL (converts http/https to ws/wss)
 */
export function getWebSocketUrl(): string {
  // Priority 1: Check for explicit WebSocket URL environment variable
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl) {
    console.log('[Config] Using WebSocket URL from environment variable:', envWsUrl);
    return envWsUrl;
  }

  // Priority 2: Auto-derive from API URL
  const apiUrl = getApiBaseUrl();
  
  // Convert HTTP/HTTPS API URL to WebSocket URL
  // http://localhost:3001/api -> ws://localhost:3001/ws
  // https://openlist-v3-server.onrender.com/api -> wss://openlist-v3-server.onrender.com/ws
  // http://192.168.1.100:3001/api -> ws://192.168.1.100:3001/ws
  const wsUrl = apiUrl
    .replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws')
    .replace(/\/api$/, '/ws');
  
  console.log('[Config] Auto-derived WebSocket URL from API URL:', wsUrl);
  return wsUrl;
}

