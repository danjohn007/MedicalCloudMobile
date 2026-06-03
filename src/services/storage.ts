// ── Universal storage ────────────────────────────────────
// Works in: web, Expo Go, and native builds
// Uses localStorage in web, falls back to in-memory in native

function isWeb(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

// In-memory fallback for native when SecureStore is unavailable
const memoryStore = new Map<string, string>();

let SecureStoreModule: any = null;
try {
  SecureStoreModule = require('expo-secure-store');
} catch {}

const canUseSecure = !!SecureStoreModule?.setItemAsync;

export async function setSecure(key: string, value: string): Promise<void> {
  if (canUseSecure) {
    await SecureStoreModule.setItemAsync(key, value);
  } else if (isWeb()) {
    localStorage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

export async function getSecure(key: string): Promise<string | null> {
  if (canUseSecure) {
    return SecureStoreModule.getItemAsync(key);
  } else if (isWeb()) {
    return localStorage.getItem(key);
  } else {
    return memoryStore.get(key) ?? null;
  }
}

export async function removeSecure(key: string): Promise<void> {
  if (canUseSecure) {
    await SecureStoreModule.deleteItemAsync(key);
  } else if (isWeb()) {
    localStorage.removeItem(key);
  } else {
    memoryStore.delete(key);
  }
}