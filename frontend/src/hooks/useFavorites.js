import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'idx-favorites';

function readFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeToStorage(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — fail silently,
    // favorites just won't persist for this session
  }
}

// Module-level store shared by every component that calls useFavorites().
// Without this, toggling a heart in PropertyCard wouldn't be reflected in a
// favorites-count badge mounted elsewhere until a full page reload.
let favoriteIds = readFromStorage();
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return favoriteIds;
}

function toggleFavorite(id) {
  const key = String(id);
  favoriteIds = favoriteIds.includes(key)
    ? favoriteIds.filter((existing) => existing !== key)
    : [...favoriteIds, key];
  writeToStorage(favoriteIds);
  notify();
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot);

  return {
    favorites,                                   // array of listing ID strings
    isFavorite: (id) => favorites.includes(String(id)),
    toggleFavorite,
    count: favorites.length,
  };
}

// Exported for test isolation only. Re-syncs the in-memory store from localStorage
// (or clears it if localStorage is empty). Production code should never call this —
// it exists because favoriteIds is a module-level singleton that normally only
// reads localStorage once, at import time.
export function __resetForTests() {
  favoriteIds = readFromStorage();
  listeners.clear();
}