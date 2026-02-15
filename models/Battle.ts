import mongoose, { Schema, Document, Model } from 'mongoose';

export type BattleStatus = 'pending' | 'active' | 'completed' | 'abandoned';
export type EndReason = 'victory' | 'forfeit' | 'draw' | 'cancelled' | null;

export interface IUnit {
  unitId: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  owner: string;
}

export interface IBlockedTile {
  x: number;
  y: number;
  itemType: string;
}

export interface ICurrentState {
  units: IUnit[];
  blockedTiles: IBlockedTile[];
}

export interface ITurnAction {
  type: 'move' | 'attack' | 'build' | 'capture' | 'wait' | 'end_turn' | 'take_off' | 'land' | 'supply' | 'load' | 'unload' | 'combine';
  unitId?: string;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface ITurn {
  turnId: string;
  deviceId: string;
  turnNumber: number;
  actions: ITurnAction[];
  timestamp: Date;
  isValid: boolean;
  validationErrors: string[];
  gameState: Record<string, unknown>;
}

export interface IBattle {
  gameSlug: string;
  battleId: string;
  displayName: string;
  player1DeviceId: string;
  player2DeviceId: string | null;
  status: BattleStatus;
  currentTurn: number;
  currentPlayerIndex: number;
  createdAt: Date;
  updatedAt: Date;
  winnerId: string | null;
  endReason: EndReason;
  mapData: Record<string, unknown>;
  isPrivate: boolean;
  currentState: ICurrentState;
  lastTurnAt: Date | null;
  turns: ITurn[];
}

export interface IBattleDocument extends IBattle, Document {}

const UnitSchema = new Schema({
  unitId: { type: String, required: true },
  type: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  hp: { type: Number, required: true },
  owner: { type: String, required: true }
}, { _id: false });

const BlockedTileSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  itemType: { type: String, required: true }
}, { _id: false });

const CurrentStateSchema = new Schema({
  units: { type: [UnitSchema], default: [] },
  blockedTiles: { type: [BlockedTileSchema], default: [] }
}, { _id: false });

const TurnActionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['move', 'attack', 'build', 'capture', 'wait', 'end_turn', 'take_off', 'land', 'supply', 'load', 'unload', 'combine'],
    required: true 
  },
  unitId: String,
  from: {
    x: Number,
    y: Number
  },
  to: {
    x: Number,
    y: Number
  },
  targetId: String,
  data: Schema.Types.Mixed
}, { _id: false });

const TurnSchema = new Schema({
  turnId: { type: String, required: true },
  deviceId: { type: String, required: true },
  turnNumber: { type: Number, required: true },
  actions: [TurnActionSchema],
  timestamp: { type: Date, default: Date.now },
  isValid: { type: Boolean, default: true },
  validationErrors: [String],
  gameState: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const BattleSchema = new Schema<IBattleDocument>({
  gameSlug: {
    type: String,
    required: true,
    index: true,
    lowercase: true
  },
  battleId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  displayName: {
    type: String,
    required: false,
    default: ''
  },
  player1DeviceId: { 
    type: String, 
    required: true,
    index: true 
  },
  player2DeviceId: { 
    type: String, 
    default: null,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed', 'abandoned'],
    default: 'pending',
    index: true
  },
  currentTurn: { 
    type: Number, 
    default: 0 
  },
  currentPlayerIndex: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  winnerId: { 
    type: String, 
    default: null 
  },
  endReason: {
    type: String,
    enum: ['victory', 'forfeit', 'draw', 'cancelled', null],
    default: null
  },
  lastTurnAt: {
    type: Date,
    default: null
  },
  mapData: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  isPrivate: {
    type: Boolean,
    default: false,
    index: true
  },
  currentState: {
    type: CurrentStateSchema,
    default: () => ({ units: [], blockedTiles: [] })
  },
  turns: {
    type: [TurnSchema],
    default: []
  }
});

BattleSchema.index({ gameSlug: 1, status: 1 });
BattleSchema.index({ gameSlug: 1, player1DeviceId: 1 });
BattleSchema.index({ gameSlug: 1, player2DeviceId: 1 });
BattleSchema.index({ gameSlug: 1, battleId: 1 });
BattleSchema.index({ gameSlug: 1, displayName: 1 });

if (mongoose.models.Battle) {
  delete mongoose.models.Battle;
}

export const Battle: Model<IBattleDocument> = mongoose.model<IBattleDocument>('Battle', BattleSchema);
