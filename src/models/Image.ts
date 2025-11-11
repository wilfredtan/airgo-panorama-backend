import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  size: number;
  width: number;
  height: number;
  fileType: string;
  s3Key: string;
  thumbnailS3Key?: string;
  bookmarked?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema: Schema = new Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  fileType: { type: String, required: true },
  s3Key: { type: String, required: true },
  thumbnailS3Key: { type: String },
  bookmarked: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Indexes for performance
ImageSchema.index({ name: 1 }); // For search functionality
ImageSchema.index({ createdAt: -1 }); // For sorting by upload date
ImageSchema.index({ bookmarked: 1 }); // For bookmark filtering

export default mongoose.model<IImage>('Image', ImageSchema);
