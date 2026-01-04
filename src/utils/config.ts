import { Capacitor } from '@capacitor/core';

/**
 * Get the API base URL for the current environment
 * In Capacitor (mobile), localhost won't work - need to use the machine's IP
 */
export function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('[Config] Using API URL from environment:', envUrl);
    return envUrl;
  }

  // Check if we're running in Capacitor (mobile app)
  const isCapacitor = Capacitor.isNativePlatform();
  
  if (isCapacitor) {
    // For mobile, default to a placeholder that needs to be configured
    // In development, you should set VITE_API_URL to your machine's IP
    // Example: VITE_API_URL=http://192.168.1.100:3001/api npm run build
    const placeholder = 'http://YOUR_LOCAL_IP:3001/api';
    console.error(
      '[Config] ❌ Running in Capacitor but VITE_API_URL not set!\n' +
      'Current URL: ' + placeholder + '\n' +
      'Please rebuild with: VITE_API_URL=http://YOUR_IP:3001/api npm run build\n' +
      'Find your IP with: ipconfig getifaddr en0'
    );
    return placeholder;
  }

  // For web development, localhost works fine
  const localhostUrl = 'http://localhost:3001/api';
  console.log('[Config] Using localhost URL:', localhostUrl);
  return localhostUrl;
}

/**
 * Get the WebSocket URL for the current environment
 */
export function getWebSocketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    return envUrl;
  }

  const apiUrl = getApiBaseUrl();
  
  // Convert HTTP API URL to WebSocket URL
  // http://localhost:3001/api -> ws://localhost:3001/ws
  // http://192.168.1.100:3001/api -> ws://192.168.1.100:3001/ws
  const wsUrl = apiUrl
    .replace(/^http/, 'ws')
    .replace(/\/api$/, '/ws');
  
  return wsUrl;
}

