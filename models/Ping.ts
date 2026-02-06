import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPing {
  gameSlug: string;
  deviceId: string;
  displayName: string;
  ipAddress?: string;
  userAgent?: string;
  message?: string;
  createdAt: Date;
}

export interface IPingDocument extends IPing, Document {}

const PingSchema = new Schema<IPingDocument>({
  gameSlug: {
    type: String,
    required: true,
    index: true
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
  ipAddress: { 
    type: String 
  },
  userAgent: { 
    type: String 
  },
  message: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

export const Ping: Model<IPingDocument> = mongoose.models.Ping || mongoose.model<IPingDocument>('Ping', PingSchema);
