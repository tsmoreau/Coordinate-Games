import mongoose, { Schema, Document, Model } from 'mongoose';

export const VALID_AVATARS = [
  'BIRD1', 'BIRD2', 'BIRD3', 'BIRD4', 'BIRD5',
  'CAT1', 'CAT2', 'CAT3', 'CAT4', 'CAT5',
  'DOG1', 'DOG2', 'DOG3', 'DOG4', 'DOG5',
  'FISH1', 'FISH2', 'FISH3', 'FISH4', 'FISH5'
] as const;

export type PlayerAvatar = typeof VALID_AVATARS[number];

export interface IPlayer {
  globalId: string;
  serialNumber: string;
  deviceId: string;
  displayName: string;
  avatar: PlayerAvatar;
  isSimulator: boolean;
  isActive: boolean;
  createdAt: Date;
  lastSeen: Date;
}

export interface IPlayerDocument extends IPlayer, Document {}

const PlayerSchema = new Schema<IPlayerDocument>({
  globalId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    default: 'Unnamed Player'
  },
  avatar: {
    type: String,
    enum: VALID_AVATARS,
    default: 'BIRD1'
  },
  isSimulator: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  }
});

if (mongoose.models.Player) {
  delete mongoose.models.Player;
}

export const Player: Model<IPlayerDocument> = mongoose.model<IPlayerDocument>('Player', PlayerSchema);
