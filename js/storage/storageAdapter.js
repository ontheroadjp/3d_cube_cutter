export class NoopStorageAdapter {
  isEnabled() { return false; }
  async list() { return []; }
  async get(_id) { return null; }
  async save(_item) {}
  async remove(_id) {}
}

export class IndexedDbStorageAdapter {
  constructor({ dbName = '3d_cube_cutter', storeName = 'user_presets' } = {}) {
    this.dbName = dbName;
    this.storeName = storeName;
    this._dbPromise = null;
  }

  isEnabled() {
    return typeof indexedDB !== 'undefined';
  }

  async _openDb() {
    if (!this.isEnabled()) return null;
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._dbPromise;
  }

  async _withStore(mode, callback) {
    const db = await this._openDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async list() {
    if (!this.isEnabled()) return [];
    return this._withStore('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async get(id) {
    if (!this.isEnabled()) return null;
    return this._withStore('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async save(item) {
    if (!this.isEnabled() || !item) return;
    return this._withStore('readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async remove(id) {
    if (!this.isEnabled()) return;
    return this._withStore('readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }
}
