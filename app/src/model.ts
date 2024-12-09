import mongoose from "mongoose";

export const ImageSchema = new mongoose.Schema({
  id: {type: String, required: true},
  index: {type: Number, required: true},
  thumbnail: {type: Buffer, required: true},
});
