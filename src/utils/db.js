// IndexedDB storage for projection mapper projects
// Replaces localStorage — supports multiple projects, larger data

const DB_NAME = 'projection-mapper';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_PROJECTS)) {
        d.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains(STORE_MEDIA)) {
        d.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode = 'readonly') {
  const d = await openDB();
  return d.transaction(storeName, mode).objectStore(storeName);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Projects ──

export async function saveProject(id, data) {
  const store = await tx(STORE_PROJECTS, 'readwrite');
  return promisify(store.put({ id, data, updatedAt: Date.now() }));
}

export async function loadProject(id) {
  const store = await tx(STORE_PROJECTS);
  const result = await promisify(store.get(id));
  return result?.data ?? null;
}

export async function listProjects() {
  const store = await tx(STORE_PROJECTS);
  return promisify(store.getAll());
}

export async function deleteProject(id) {
  const store = await tx(STORE_PROJECTS, 'readwrite');
  return promisify(store.delete(id));
}

// ── Media (images, etc as blobs) ──

export async function saveMedia(id, blob) {
  const store = await tx(STORE_MEDIA, 'readwrite');
  return promisify(store.put({ id, blob, createdAt: Date.now() }));
}

export async function loadMedia(id) {
  const store = await tx(STORE_MEDIA);
  const result = await promisify(store.get(id));
  return result?.blob ?? null;
}

export async function deleteMedia(id) {
  const store = await tx(STORE_MEDIA, 'readwrite');
  return promisify(store.delete(id));
}
