import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// SecureStore (Keychain/Keystore) has no web implementation, so we fall back to
// AsyncStorage there. On iOS/Android — the actual mobile app — auth data is encrypted
// at rest instead of sitting in plaintext AsyncStorage.
let nativeAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (nativeAvailable === null) {
    nativeAvailable = await SecureStore.isAvailableAsync();
  }
  return nativeAvailable;
}

export async function getItem(key: string): Promise<string | null> {
  return (await isSecureStoreAvailable()) ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function removeItem(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}
