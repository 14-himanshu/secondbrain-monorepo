import mongoose, { model, Schema } from "mongoose";

mongoose.connect(
  "mongodb+srv://klawchop1_db_user:9wYz7V9u2elw4w0d@cluster0.hejysje.mongodb.net/brainly"
);
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
    hash: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true,
      unique : true
     },
})
export const LinkModel = model("Link",LinkSchema);

export const ContentModel = model("Content",ContentSchema);