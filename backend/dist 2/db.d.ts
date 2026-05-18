import mongoose from "mongoose";
export declare const connectToDatabase: () => Promise<void>;
export declare const UserModel: mongoose.Model<{
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
}, {}, mongoose.DefaultSchemaOptions> & {
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    password?: string | null;
    username?: string | null;
    google?: {
        connected: boolean;
        scope: string[];
        loginOnly: boolean;
        email?: string | null;
        expiryDate?: NativeDate | null;
        updatedAt?: NativeDate | null;
        accessTokenEnc?: string | null;
        refreshTokenEnc?: string | null;
        accessToken?: string | null;
        refreshToken?: string | null;
    } | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const LinkModel: mongoose.Model<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
}, {}, mongoose.DefaultSchemaOptions> & {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    shareType: "private" | "link" | "public";
    isPublic: boolean;
    shareId?: string | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const ContentModel: mongoose.Model<{
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    tags: string[];
    topics: string[];
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    embedding: number[];
    embeddingStatus: "pending" | "completed" | "failed";
    aiStatus: "completed" | "failed" | "queued" | "processing" | "scraping" | "analyzing" | "summarized" | "needs_manual_content";
    aiProgress: number;
    link?: string | null;
    type?: "video" | "post" | "document" | null;
    description?: string | null;
    title?: string | null;
    normalizedLink?: string | null;
    aiError?: string | null;
    aiMetadata?: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const BrainInsightModel: mongoose.Model<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    userId: {
        prototype?: mongoose.Types.ObjectId | null;
        cacheHexString?: unknown;
        generate?: {} | null;
        createFromTime?: {} | null;
        createFromHexString?: {} | null;
        createFromBase64?: {} | null;
        isValid?: {} | null;
    };
    insights: mongoose.Types.DocumentArray<{
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }> & {
        sources: mongoose.Types.DocumentArray<{
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }> & {
            link?: string | null;
            id?: string | null;
            title?: string | null;
        }>;
        description?: string | null;
        title?: string | null;
        category?: string | null;
        confidence?: string | null;
    }>;
    generatedAt: NativeDate;
    summary?: string | null;
    contentVersion?: number | null;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=db.d.ts.map