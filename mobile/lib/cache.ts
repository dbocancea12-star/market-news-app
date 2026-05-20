import AsyncStorage from "@react-native-async-storage/async-storage";

export const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeCache = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(value));
  } catch {
    // ignore — cache is best-effort
  }
};
