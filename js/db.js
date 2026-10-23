/**
 * js/db.js
 * IndexedDB storage engine for Source Code Viewer.
 * Stores raw binary assets and session snapshots natively to eliminate Base64 inflation.
 * Contains automatic reconnection guards against invalidated database handles.
 */

const SCVDB = {
    DB_NAME: 'SourceCodeViewerDB',
    DB_VERSION: 1,
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = (e) => {
                console.warn("IndexedDB open failed:", e);
                reject(e);
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                };
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('extractions')) {
                    db.createObjectStore('extractions', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('snapshots')) {
                    db.createObjectStore('snapshots', { keyPath: 'url' });
                }
            };
        });
    },

    async saveSession(id, sessionData) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['extractions'], 'readwrite');
                const store = tx.objectStore('extractions');
                const record = {
                    id,
                    ...sessionData,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = (err) => reject(err);
            } catch (err) {
                this.db = null;
                reject(err);
            }
        });
    },

    async getSession(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['extractions'], 'readonly');
                const store = tx.objectStore('extractions');
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = (err) => reject(err);
            } catch (err) {
                this.db = null;
                reject(err);
            }
        });
    },

    async saveSnapshot(url, snapshotData) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['snapshots'], 'readwrite');
                const store = tx.objectStore('snapshots');
                const record = {
                    url,
                    ...snapshotData,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = (err) => reject(err);
            } catch (err) {
                this.db = null;
                reject(err);
            }
        });
    },

    async getSnapshot(url) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['snapshots'], 'readonly');
                const store = tx.objectStore('snapshots');
                const req = store.get(url);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = (err) => reject(err);
            } catch (err) {
                this.db = null;
                reject(err);
            }
        });
    },

    async pruneOldSessions(maxAgeMs = 2 * 60 * 60 * 1000) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['extractions'], 'readwrite');
                const store = tx.objectStore('extractions');
                const req = store.openCursor();
                const now = Date.now();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (cursor.value && cursor.value.timestamp && (now - cursor.value.timestamp > maxAgeMs)) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        resolve(true);
                    }
                };
                req.onerror = (err) => reject(err);
            } catch (err) {
                this.db = null;
                reject(err);
            }
        });
    }
};

if (typeof globalThis !== 'undefined') globalThis.SCVDB = SCVDB;
if (typeof window !== 'undefined') window.SCVDB = SCVDB;