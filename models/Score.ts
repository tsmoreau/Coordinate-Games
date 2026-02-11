import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScore {
  gameSlug: string;
  deviceId: string;
  displayName: string;
  score: number;
  category: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IScoreDocument extends IScore, Document {}

const ScoreSchema = new Schema<IScoreDocument>({
  gameSlug: { 
    type: String, 
    required: true,
    index: true,
    lowercase: true
  },
  deviceId: { 
    type: String, 
    required: true,
    index: true
  },
  displayName: { 
    type: String, 
    required: true
  },
  score: { 
    type: Number, 
    required: true,
    index: true
  },
  category: {
    type: String,
    default: 'default',
    index: true
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

ScoreSchema.index({ gameSlug: 1, category: 1, score: -1 });
ScoreSchema.index({ gameSlug: 1, category: 1, deviceId: 1 });
ScoreSchema.index({ gameSlug: 1, category: 1, createdAt: -1 });
ScoreSchema.index({ gameSlug: 1, score: -1 });
ScoreSchema.index({ gameSlug: 1, deviceId: 1 });

if (mongoose.models.Score) {
  delete mongoose.models.Score;
}

export const Score: Model<IScoreDocument> = mongoose.model<IScoreDocument>('Score', ScoreSchema);
