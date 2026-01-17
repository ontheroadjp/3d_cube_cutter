import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDbStorageAdapter, NoopStorageAdapter } from '../../js/storage/storageAdapter.js';

const createFakeIndexedDB = () => {
  const databases = new Map();

  const createRequest = (result) => {
    const req = { result: null, onsuccess: null, onerror: null };
    setTimeout(() => {
      req.result = result;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  };

  const createStore = () => {
    const data = new Map();
    return {
      createIndex: () => {},
      getAll: () => createRequest(Array.from(data.values())),
      get: (id) => createRequest(data.get(id) || null),
      put: (item) => {
        data.set(item.id, item);
        return createRequest();
      },
      delete: (id) => {
        data.delete(id);
        return createRequest();
      }
    };
  };

  const createDb = () => {
    const stores = new Map();
    return {
      objectStoreNames: {
        contains: (name) => stores.has(name)
      },
      createObjectStore: (name) => {
        const store = createStore();
        stores.set(name, store);
        return store;
      },
      transaction: (name) => {
        const tx = {
          oncomplete: null,
          onerror: null,
          onabort: null,
          objectStore: () => stores.get(name)
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
        return tx;
      }
    };
  };

  return {
    open: (name) => {
      const req = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => {
        let db = databases.get(name);
        const isNew = !db;
        if (!db) {
          db = createDb();
          databases.set(name, db);
        }
        req.result = db;
        if (isNew && req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    }
  };
};

describe('StorageAdapter', () => {
  afterEach(() => {
    delete global.indexedDB;
  });

  it('NoopStorageAdapter should be disabled and return defaults', async () => {
    const adapter = new NoopStorageAdapter();
    expect(adapter.isEnabled()).toBe(false);
    expect(await adapter.list()).toEqual([]);
    expect(await adapter.get('x')).toBeNull();
  });

  it('IndexedDbStorageAdapter should save and load items', async () => {
    global.indexedDB = createFakeIndexedDB();
    const adapter = new IndexedDbStorageAdapter({ dbName: 'test-db', storeName: 'items' });
    const item = { id: 'item-1', name: 'Test' };
    await adapter.save(item);
    const loaded = await adapter.get('item-1');
    expect(loaded).toEqual(item);
    const list = await adapter.list();
    expect(list).toEqual([item]);
    await adapter.remove('item-1');
    const after = await adapter.get('item-1');
    expect(after).toBeNull();
  });
});
