export interface QueuedContactDraft {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  createdAt: number;
  status: "pending" | "sending" | "failed";
  retryCount: number;
  lastError?: string;
}

const DB_NAME = "ssp_portfolio_offline";
const DB_VERSION = 1;
const STORE_NAME = "queued_inquiries";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this browser."));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function saveOfflineDraft(
  draft: Omit<QueuedContactDraft, "id" | "createdAt" | "status" | "retryCount">,
): Promise<QueuedContactDraft> {
  const db = await openDB();
  const entry: QueuedContactDraft = {
    ...draft,
    id:
      crypto.randomUUID?.() ??
      `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    status: "pending",
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () =>
      reject(
        new Error(
          `Could not save your draft locally: ${req.error?.message ?? "storage error"}.`,
        ),
      );
  });
}

export async function getPendingDrafts(): Promise<QueuedContactDraft[]> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return [];
  }
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as QueuedContactDraft[]) ?? []);
      req.onerror = () =>
        reject(
          new Error(
            `Could not retrieve saved drafts: ${req.error?.message ?? "storage error"}.`,
          ),
        );
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(
        new Error(
          `Could not delete draft: ${req.error?.message ?? "storage error"}.`,
        ),
      );
  });
}
