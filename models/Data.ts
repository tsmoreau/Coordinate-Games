import mongoose, { Schema, Document, Model } from 'mongoose';

export type DataScope = 'global' | 'player' | 'public';

export interface IData {
  gameSlug: string;
  key: string;
  value: Record<string, unknown>;
  scope: DataScope;
  ownerId: string | null;
  ownerDisplayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDataDocument extends IData, Document {}

const DataSchema = new Schema<IDataDocument>({
  gameSlug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  key: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  scope: {
    type: String,
    enum: ['global', 'player', 'public'],
    default: 'global',
    index: true
  },
  ownerId: {
    type: String,
    default: null,
    index: true
  },
  ownerDisplayName: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

DataSchema.index({ gameSlug: 1, key: 1 }, { unique: true });

DataSchema.index({ gameSlug: 1, scope: 1, ownerId: 1 });

DataSchema.index({ gameSlug: 1, key: 1, ownerId: 1 });

if (mongoose.models.Data) {
  delete mongoose.models.Data;
}

export const Data: Model<IDataDocument> = mongoose.model<IDataDocument>('Data', DataSchema);
