import mongoose, { model, Schema } from "mongoose";
import { getMongoDbUri } from "./config.js";
import { AI_STATUSES, CONTENT_TYPES, EMBEDDING_STATUSES } from "@secondbrain/contracts";

export const connectToDatabase = async () => {
  await mongoose.connect(getMongoDbUri());
};
const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: String,
  email: String,
  bio: String,
  avatarBase64: { type: String, select: true },
  aiPreferences: {
    tone: { type: String, default: "Concise & Professional" },
    autoTagging: { type: Boolean, default: false },
    deepExtraction: { type: Boolean, default: true }
  },
  razorpayCustomerId: String,
  razorpaySubscriptionId: String,
  subscriptionPlan: { type: String, default: 'free' },
  subscriptionStatus: { type: String, default: 'inactive' },
  subscriptionPeriodEnd: Date,
  aiCreditsRemaining: { type: Number, default: 5 },
  billingCycleEnd: Date,
  google: {
    connected: { type: Boolean, default: false },
    email: String,
    accessTokenEnc: { type: String, select: false },
    refreshTokenEnc: { type: String, select: false },
    // legacy token fields retained for backward compatibility (do not populate in new flows)
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    scope: [String],
    expiryDate: Date,
    updatedAt: Date,
    loginOnly: { type: Boolean, default: false },
  },
});

export const UserModel = (mongoose.models.User || model("User",UserSchema)) as mongoose.Model<any>;

const ContentSchema = new Schema({
    title: String,
    description: String, // Added for semantic search context
    link: String,
    normalizedLink: String,
    tags: [String],
    topics: [String], // AI-extracted themes
    type: { type: String, enum: CONTENT_TYPES as unknown as string[] },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    embedding: { type: [Number], select: false },
    embeddingStatus: { 
        type: String, 
        enum: EMBEDDING_STATUSES as unknown as string[], 
        default: 'pending' 
    },
    aiStatus: {
        type: String,
        enum: AI_STATUSES as unknown as string[],
        default: 'unprocessed'
    },
    aiProgress: { type: Number, default: 0 },
    aiMetadata: {
        domain: String,
        source: String,
        contentType: String,
        estimatedTopics: [String],
        normalizedLink: String,
        platform: String,
        extractionSource: String,
        extractionConfidence: Number,
        validationPassed: Boolean,
        cacheEligible: Boolean,
        sourceType: String,
        extractionQuality: String,
        extractionWordCount: Number,
        ingestionStatus: String,
        ingestionReason: String,
        summarizationSkipped: Boolean,
        acquisitionMethod: String,
        accessRequirement: String,
        transcriptAvailable: Boolean,
        author: String,
        channel: String,
        durationSeconds: Number
    },
    aiError: String
}, { timestamps: true });

ContentSchema.index({ userId: 1 });
ContentSchema.index({ embeddingStatus: 1 });
ContentSchema.index({ aiStatus: 1 });
ContentSchema.index({ createdAt: -1 });
ContentSchema.index({ normalizedLink: 1, aiStatus: 1 });
ContentSchema.index({ 
  title: "text", 
  description: "text", 
  tags: "text" 
}, { 
  weights: { title: 10, description: 5, tags: 2 },
  name: "TextIndex" 
});


const LinkSchema = new Schema({
    shareId: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
    shareType: { type: String, enum: ['private', 'link', 'public'], default: 'private' },
    isPublic: { type: Boolean, default: false },
});
export const LinkModel = (mongoose.models.Link || model("Link", LinkSchema)) as mongoose.Model<any>;

export const ContentModel = (mongoose.models.Content || model("Content",ContentSchema)) as mongoose.Model<any>;

const BrainInsightSchema = new Schema({
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
    summary: String,
    insights: [{
        category: String,
        title: String,
        description: String,
        confidence: String,
        sources: [{ title: String, id: String, link: String }]
    }],
    generatedAt: { type: Date, default: Date.now },
    contentVersion: Number // To track if we need to regenerate
}, { timestamps: true });

export const BrainInsightModel = (mongoose.models.BrainInsight || model("BrainInsight", BrainInsightSchema)) as mongoose.Model<any>;
