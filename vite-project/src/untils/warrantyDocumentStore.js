
const DB_NAME =
  "WarrantyVaultDB";

const STORE_NAME =
  "documents";

const DB_VERSION = 1;

// =========================================================
// OPEN DATABASE
// =========================================================

function openDatabase() {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof window ===
          "undefined" ||
        !window.indexedDB
      ) {
        reject(
          new Error(
            "IndexedDB is not supported by this browser."
          )
        );

        return;
      }

      const request =
        window.indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              STORE_NAME
            )
          ) {
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath: "id",
              }
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error ||
              new Error(
                "Unable to open document storage."
              )
          );
        };
    }
  );
}

// =========================================================
// SAVE WARRANTY DOCUMENT
// =========================================================

export async function saveWarrantyDocument(
  id,
  file
) {
  if (
    !id ||
    !file
  ) {
    return;
  }

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const documentBlob =
        file instanceof Blob
          ? file
          : new Blob(
              [file],
              {
                type:
                  file?.type ||
                  "application/octet-stream",
              }
            );

      store.put({
        id:
          String(id),

        file:
          documentBlob,

        fileName:
          file?.name ||
          "Warranty document",

        fileType:
          file?.type ||
          "application/octet-stream",

        fileSize:
          file?.size ||
          documentBlob.size,

        savedAt:
          new Date().toISOString(),
      });

      transaction.oncomplete =
        () => {
          db.close();
          resolve();
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "Unable to save document."
              )
          );
        };

      transaction.onabort =
        () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "Unable to save document."
              )
          );
        };
    }
  );
}

// =========================================================
// GET WARRANTY DOCUMENT
// =========================================================
// Supports the current document format and the older
// format that used { blob, name, type, size }.
// =========================================================

export async function getWarrantyDocument(
  id
) {
  if (!id) {
    return null;
  }

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            STORE_NAME
          )
          .get(
            String(id)
          );

      request.onsuccess =
        () => {
          db.close();

          const record =
            request.result;

          if (!record) {
            resolve(
              null
            );

            return;
          }

          /*
          ------------------------------------------------
          CURRENT FORMAT
          ------------------------------------------------
          */

          if (
            record.file instanceof Blob
          ) {
            resolve({
              ...record,
              id:
                String(
                  record.id ??
                    id
                ),
              file:
                record.file,
              fileName:
                record.fileName ||
                "Warranty document",
              fileType:
                record.fileType ||
                record.file.type ||
                "application/octet-stream",
              fileSize:
                record.fileSize ??
                record.file.size,
            });

            return;
          }

          /*
          ------------------------------------------------
          LEGACY FORMAT
          ------------------------------------------------
          */

          if (
            record.blob instanceof Blob
          ) {
            resolve({
              id:
                String(id),

              file:
                record.blob,

              fileName:
                record.name ||
                "Warranty document",

              fileType:
                record.type ||
                record.blob.type ||
                "application/octet-stream",

              fileSize:
                record.size ??
                record.blob.size,

              savedAt:
                record.savedAt ||
                null,
            });

            return;
          }

          resolve(
            null
          );
        };

      request.onerror =
        () => {
          db.close();

          reject(
            request.error ||
              new Error(
                "Unable to read document."
              )
          );
        };
    }
  );
}

// =========================================================
// DELETE WARRANTY DOCUMENT
// =========================================================

export async function deleteWarrantyDocument(
  id
) {
  if (!id) {
    return;
  }

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .delete(
          String(id)
        );

      transaction.oncomplete =
        () => {
          db.close();
          resolve();
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "Unable to delete document."
              )
          );
        };

      transaction.onabort =
        () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "Unable to delete document."
              )
          );
        };
    }
  );
}

// =========================================================
// CREATE DOCUMENT URL
// =========================================================

export function createDocumentUrl(
  record
) {
  if (
    !record?.file ||
    !(record.file instanceof Blob)
  ) {
    return "";
  }

  return URL.createObjectURL(
    record.file
  );
}

