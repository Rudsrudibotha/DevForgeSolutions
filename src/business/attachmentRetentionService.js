// Business Layer - Message attachment retention.
//
// Chat images are kept for a fixed window (default 60 days, override
// with KCH_ATTACHMENT_RETENTION_DAYS) and then removed from blob
// storage by a daily sweep. The MessageAttachments row is soft-deleted
// (IsDeleted = 1, DeletedAt set) so the chat history can still render
// an "image expired" placeholder; the message text itself is kept.
//
// Platform-wide job by design: it runs across tenants because blob
// retention is an operational policy, not a tenant action.

const { MessageAttachmentRepository } = require('../data/kinderCareHubRepository');
const { getBlobStorageProvider } = require('../data/blobStorage');

const DEFAULT_RETENTION_DAYS = 60;
const DEFAULT_BATCH_SIZE = 200;
const MAX_BATCHES_PER_RUN = 20;

class AttachmentRetentionService {
  constructor(deps = {}) {
    this.attachments = deps.attachmentRepository || new MessageAttachmentRepository();
    this.blobProvider = deps.blobProvider || null;
  }

  provider() {
    return this.blobProvider || getBlobStorageProvider();
  }

  retentionDays(override) {
    const days = Number(override || process.env.KCH_ATTACHMENT_RETENTION_DAYS || DEFAULT_RETENTION_DAYS);
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
  }

  // Delete expired attachment blobs and soft-delete their rows.
  // Idempotent: a blob that is already gone still gets its row marked,
  // so a crashed run is safe to repeat.
  async sweepExpiredAttachments({ retentionDays, batchSize = DEFAULT_BATCH_SIZE } = {}) {
    const days = this.retentionDays(retentionDays);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const provider = this.provider();

    let scanned = 0;
    let deleted = 0;
    let failed = 0;

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
      const rows = await this.attachments.listExpired(cutoff, { limit: batchSize });
      if (!rows.length) break;

      let progressed = 0;
      for (const row of rows) {
        scanned++;
        try {
          await provider.delete(row.StoragePath);
          if (row.ThumbnailPath) await provider.delete(row.ThumbnailPath);
          await this.attachments.markDeleted(row.MessageAttachmentId);
          deleted++;
          progressed++;
        } catch (err) {
          failed++;
          console.warn('[retention] attachment %d delete failed: %s', row.MessageAttachmentId, err.message);
        }
      }
      // Every row failed (e.g. storage down): stop instead of spinning
      // on the same batch.
      if (!progressed) break;
      if (rows.length < batchSize) break;
    }

    return { retentionDays: days, cutoff: cutoff.toISOString(), scanned, deleted, failed };
  }
}

module.exports = { AttachmentRetentionService, DEFAULT_RETENTION_DAYS };
