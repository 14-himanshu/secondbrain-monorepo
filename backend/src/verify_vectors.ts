import mongoose from "mongoose";
import { ContentModel, connectToDatabase } from "./db.js";
import dotenv from "dotenv";
dotenv.config();

async function verifyVectors() {
  await connectToDatabase();
  console.log("Connected to DB...");

  const sample = await ContentModel.findOne({ embedding: { $exists: true, $ne: [] } }).select("+embedding");
  
  if (!sample) {
    console.log("No embeddings found in database.");
  } else {
    console.log("Embedding found!");
    console.log(`Dimensions: ${sample.embedding?.length}`);
    console.log(`Sample Data (First 3): ${sample.embedding?.slice(0, 3)}`);
  }

  const count = await ContentModel.countDocuments({ embedding: { $exists: true, $ne: [] } });
  console.log(`Total documents with embeddings: ${count}`);

  await mongoose.disconnect();
}

verifyVectors();
