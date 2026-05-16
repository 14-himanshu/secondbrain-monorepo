import mongoose, { model, Schema } from "mongoose";
import { getMongoDbUri } from "./config.js";

export const connectToDatabase = async () => {
  await mongoose.connect(getMongoDbUri());
};
const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: String,
});

export const UserModel = model("User",UserSchema);

const ContentSchema = new Schema({
    title: String,
    description: String, // Added for semantic search context
    link: String,
    normalizedLink: String,
    tags: [String],
    topics: [String], // AI-extracted themes
    type: String,
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    embedding: { type: [Number], select: false },
    embeddingStatus: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'], 
        default: 'pending' 
    },
    aiStatus: {
        type: String,
        enum: ['queued', 'processing', 'scraping', 'analyzing', 'summarized', 'completed', 'failed'],
        default: 'queued'
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
export const LinkModel = model("Link", LinkSchema);

export const ContentModel = model("Content",ContentSchema);

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

export const BrainInsightModel = model("BrainInsight", BrainInsightSchema);
