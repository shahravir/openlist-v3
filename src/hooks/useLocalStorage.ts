import { useState, useCallback, useRef, useEffect } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: SetValue<T>) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined || item === 'undefined' || item === 'null') {
        return initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // Clear corrupted data
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore errors when clearing
      }
      return initialValue;
    }
  });

  // Use a ref to always have the latest value
  const valueRef = useRef(storedValue);
  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback((value: SetValue<T>) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(valueRef.current) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

