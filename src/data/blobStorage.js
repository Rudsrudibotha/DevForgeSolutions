// Blob storage abstraction.
//
// Two providers:
//   - localDiskStorageProvider  - default; writes to storage/ on disk.
//                                 Suitable for dev and single-instance.
//                                 NOT for production multi-instance deploys.
//   - azureBlobStorageProvider  - writes to Azure Blob Storage container
//                                 referenced by AZURE_BLOB_CONNECTION_STRING.
//
// Interface (all providers):
//   store({ buffer, contentType, filename, tenantId, schoolId, ownerId })
//        -> Promise<{ blobUrl, provider, contentType, sizeBytes, storedAt }>
//   read(blobUrl)                  -> Promise<{ buffer, contentType, filename }>
//   delete(blobUrl)                -> Promise<{ deleted: boolean }>
//
// The factory `getBlobStorageProvider()` returns the active provider
// based on env. Routes and services must call the factory - never
// import a provider directly - so tests can swap it out.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PROVIDER_LOCAL = 'localDisk';
const PROVIDER_AZURE = 'azureBlob';

function safeSegment(value) {
  if (value === null || value === undefined) return 'unknown';
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'unknown';
}

function buildBlobKey({ tenantId, schoolId, ownerId, contentType, originalName }) {
  const ext = path.extname(originalName || '') || '';
  const rand = crypto.randomBytes(16).toString('hex');
  const stamp = new Date().toISOString().slice(0, 10);
  return `t${safeSegment(tenantId)}/s${safeSegment(schoolId)}/u${safeSegment(ownerId)}/${stamp}/${rand}${ext}`;
}

function localDiskProvider(options = {}) {
  const rootDir = options.rootDir
    || process.env.LOCAL_BLOB_DIR
    || path.resolve(__dirname, '..', '..', 'storage', 'message-attachments');
  return {
    name: PROVIDER_LOCAL,
    async store({ buffer, contentType, filename, tenantId, schoolId, ownerId }) {
      if (!buffer) throw new Error('store: buffer is required');
      const key = buildBlobKey({ tenantId, schoolId, ownerId, contentType, originalName: filename });
      const fullPath = path.join(rootDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      return {
        blobUrl: `local://${key}`,
        provider: PROVIDER_LOCAL,
        contentType: contentType || 'application/octet-stream',
        sizeBytes: buffer.length,
        storedAt: new Date().toISOString()
      };
    },
    async read(blobUrl) {
      if (!blobUrl || !blobUrl.startsWith('local://')) throw new Error('read: invalid blobUrl');
      const key = blobUrl.slice('local://'.length);
      const fullPath = path.join(rootDir, key);
      const buffer = fs.readFileSync(fullPath);
      return {
        buffer,
        contentType: 'application/octet-stream',
        filename: path.basename(key)
      };
    },
    async delete(blobUrl) {
      if (!blobUrl || !blobUrl.startsWith('local://')) return { deleted: false };
      const key = blobUrl.slice('local://'.length);
      const fullPath = path.join(rootDir, key);
      try {
        fs.unlinkSync(fullPath);
        return { deleted: true };
      } catch (err) {
        if (err.code === 'ENOENT') return { deleted: false };
        throw err;
      }
    }
  };
}

function azureBlobProvider(options = {}) {
  const connectionString = options.connectionString || process.env.AZURE_BLOB_CONNECTION_STRING;
  const containerName = options.containerName || process.env.AZURE_BLOB_CONTAINER || 'kch-attachments';
  if (!connectionString) {
    throw new Error('azureBlobProvider: AZURE_BLOB_CONNECTION_STRING is not set');
  }
  let clientPromise = null;
  async function getClient() {
    if (!clientPromise) {
      const { BlobServiceClient } = require('@azure/storage-blob');
      const client = BlobServiceClient.fromConnectionString(connectionString);
      const container = client.getContainerClient(containerName);
      await container.createIfNotExists({ access: 'blob' });
      clientPromise = { client, container };
    }
    return clientPromise;
  }
  return {
    name: PROVIDER_AZURE,
    async store({ buffer, contentType, filename, tenantId, schoolId, ownerId }) {
      if (!buffer) throw new Error('store: buffer is required');
      const { container } = await getClient();
      const key = buildBlobKey({ tenantId, schoolId, ownerId, contentType, originalName: filename });
      const blockBlob = container.getBlockBlobClient(key);
      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' }
      });
      return {
        blobUrl: `azure://${containerName}/${key}`,
        provider: PROVIDER_AZURE,
        contentType: contentType || 'application/octet-stream',
        sizeBytes: buffer.length,
        storedAt: new Date().toISOString()
      };
    },
    async read(blobUrl) {
      if (!blobUrl || !blobUrl.startsWith('azure://')) throw new Error('read: invalid blobUrl');
      const { container } = await getClient();
      const rest = blobUrl.slice('azure://'.length);
      const slash = rest.indexOf('/');
      if (slash < 0) throw new Error('read: malformed blobUrl');
      const key = rest.slice(slash + 1);
      const blockBlob = container.getBlockBlobClient(key);
      const download = await blockBlob.download();
      const chunks = [];
      for await (const chunk of download.readableStreamBody) chunks.push(chunk);
      return {
        buffer: Buffer.concat(chunks),
        contentType: download.contentType || 'application/octet-stream',
        filename: path.basename(key)
      };
    },
    async delete(blobUrl) {
      if (!blobUrl || !blobUrl.startsWith('azure://')) return { deleted: false };
      const { container } = await getClient();
      const rest = blobUrl.slice('azure://'.length);
      const slash = rest.indexOf('/');
      if (slash < 0) return { deleted: false };
      const key = rest.slice(slash + 1);
      await container.getBlockBlobClient(key).deleteIfExists();
      return { deleted: true };
    }
  };
}

let cachedProvider = null;
function getBlobStorageProvider() {
  if (cachedProvider) return cachedProvider;
  if (process.env.AZURE_BLOB_CONNECTION_STRING) {
    cachedProvider = azureBlobProvider();
  } else {
    cachedProvider = localDiskProvider();
  }
  return cachedProvider;
}

function resetBlobStorageProviderForTests() {
  cachedProvider = null;
}

function describeActiveProvider() {
  if (process.env.AZURE_BLOB_CONNECTION_STRING) return PROVIDER_AZURE;
  return PROVIDER_LOCAL;
}

module.exports = {
  getBlobStorageProvider,
  resetBlobStorageProviderForTests,
  describeActiveProvider,
  localDiskProvider,
  azureBlobProvider,
  PROVIDER_LOCAL,
  PROVIDER_AZURE
};
