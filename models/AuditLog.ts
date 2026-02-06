import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog {
  gameSlug: string;
  action: string;
  ip: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>({
  gameSlug: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  ip: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ gameSlug: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
