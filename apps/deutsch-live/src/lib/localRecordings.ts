export type LocalRecording = {
  id: string;
  ownerKey: string;
  name: string;
  filename: string;
  createdAt: number;
  blob: Blob;
};

export const MAX_RECORDING_BYTES = 100 * 1024 * 1024;
const DATABASE = import.meta.env.VITE_PLATFORM_INTEGRATION === "true"
  ? "sprachplattform-deutschlive-recordings-v1"
  : "deutschlive-recordings-v1";
const STORE = "recordings";

export function isAudioFile(file: File) {
  return file.size > 0 && file.size <= MAX_RECORDING_BYTES
    && (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|oga|webm|m4a|aac|flac)$/i.test(file.name));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("storage_unavailable"));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("ownerKey", "ownerKey");
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("storage_unavailable"));
  });
}

async function runTransaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("storage_unavailable")); };
    transaction.onerror = () => { /* onabort reports the failure; writes never resolve early. */ };
  });
}

export async function listLocalRecordings(ownerKey: string): Promise<LocalRecording[]> {
  const recordings = await runTransaction("readonly", store => store.index("ownerKey").getAll(ownerKey));
  return recordings.sort((a: LocalRecording, b: LocalRecording) => b.createdAt - a.createdAt);
}

export async function addLocalRecordings(files: File[], ownerKey: string) {
  if (!files.length || files.some(file => !isAudioFile(file))) throw new Error("invalid_audio");
  const recordings: LocalRecording[] = files.map((file, index) => ({
    id: crypto.randomUUID(), ownerKey, filename: file.name,
    name: file.name.replace(/\.[^.]+$/, ""), createdAt: Date.now() + index, blob: file,
  }));
  await runTransaction("readwrite", store => {
    const requests = recordings.map(recording => store.add(recording));
    return requests[requests.length - 1];
  });
  return recordings;
}

export async function removeLocalRecording(id: string, ownerKey: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result?.ownerKey === ownerKey) store.delete(id);
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}
