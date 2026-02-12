import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGameIdentity {
  gameSlug: string;
  deviceId: string;
  tokenHash: string;
  displayName: string;
  avatar: string | null;
  createdAt: Date;
  lastSeen: Date;
  isActive: boolean;
}

export interface IGameIdentityDocument extends IGameIdentity, Document {}

const GameIdentitySchema = new Schema<IGameIdentityDocument>({
  gameSlug: {
    type: String,
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String,
    default: 'Unnamed Player'
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

GameIdentitySchema.index({ gameSlug: 1, deviceId: 1 }, { unique: true });
GameIdentitySchema.index({ gameSlug: 1, tokenHash: 1 });

if (mongoose.models.GameIdentity) {
  delete mongoose.models.GameIdentity;
}

export const GameIdentity: Model<IGameIdentityDocument> = mongoose.model<IGameIdentityDocument>('GameIdentity', GameIdentitySchema);
