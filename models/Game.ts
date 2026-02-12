import mongoose, { Schema, Document, Model } from 'mongoose';

export type GameCapability = 'data' | 'async' | 'leaderboard';

export interface IHaikunatorConfig {
  adjectives: string[];
  nouns: string[];
}

export interface IVersioning {
  minVersion: string;
  currentVersion: string;
  updateUrl: string | null;
}

export interface IGame {
  slug: string;
  name: string;
  description?: string | null;
  tagline?: string | null;
  capabilities: GameCapability[];
  avatars: string[];
  haikunator?: IHaikunatorConfig | null;
  versioning?: IVersioning | null;
  maintenance: boolean;
  motd?: string | null;
  active: boolean;
  createdAt: Date;
}

export interface IGameDocument extends IGame, Document {}

const HaikunatorSchema = new Schema({
  adjectives: { type: [String], required: true },
  nouns: { type: [String], required: true }
}, { _id: false });

const VersioningSchema = new Schema({
  minVersion: { type: String, required: true },
  currentVersion: { type: String, required: true },
  updateUrl: { type: String, default: null }
}, { _id: false });

const GameSchema = new Schema<IGameDocument>({
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  name: { 
    type: String, 
    required: true 
  },
  description: {
    type: String,
    default: null
  },
  tagline: {
    type: String,
    default: null
  },
  capabilities: { 
    type: [String],
    enum: ['data', 'async', 'leaderboard'],
    required: true,
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'Game must have at least one capability'
    }
  },
  avatars: {
    type: [String],
    default: []
  },
  haikunator: {
    type: HaikunatorSchema,
    default: null
  },
  versioning: {
    type: VersioningSchema,
    default: null
  },
  maintenance: {
    type: Boolean,
    default: false
  },
  motd: {
    type: String,
    default: null
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

if (mongoose.models.Game) {
  delete mongoose.models.Game;
}

export const Game: Model<IGameDocument> = mongoose.model<IGameDocument>('Game', GameSchema);