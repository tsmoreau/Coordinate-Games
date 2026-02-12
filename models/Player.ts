import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlayer {
  globalId: string;
  serialNumber: string;
  deviceId: string;
  displayName: string;
  avatar: string | null;
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
    default: null
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
