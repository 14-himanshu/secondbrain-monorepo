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
    link: String,
    tags: [{type: mongoose.Types.ObjectId, ref: 'Tag'}],
    type: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true },
})
const LinkSchema = new Schema({
    shareId: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
    shareType: { type: String, enum: ['private', 'link', 'public'], default: 'private' },
    isPublic: { type: Boolean, default: false },
});
export const LinkModel = model("Link", LinkSchema);

export const ContentModel = model("Content",ContentSchema);
