import { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { bucketName } from '../s3-client';
import ImageModel from '../models/Image';
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

export const downloadImageHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  // Convert to the expected format
  const imageData = {
    id: image._id.toString(),
    name: image.name,
    size: image.size,
    width: image.width,
    height: image.height,
    fileType: image.fileType,
    s3Key: image.s3Key,
    createdAt: image.createdAt,
    bookmarked: image.bookmarked,
  };

  // Return download URL instead of streaming file
  if (imageData.s3Key.startsWith('uploads/')) {
    // Local file - return local download URL
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/images/local-download/${id}`;
    res.json({
      downloadUrl,
      fileName: imageData.name,
      fileSize: imageData.size,
      fileType: imageData.fileType
    });
  } else {
    // S3 object - return presigned URL for direct download
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: imageData.s3Key,
    });

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    res.json({
      downloadUrl,
      fileName: imageData.name,
      fileSize: imageData.size,
      fileType: imageData.fileType
    });
  }
};

// New handler for thumbnail downloads
export const thumbnailDownloadHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  if (!image.thumbnailS3Key) {
    return res.status(404).json({ error: 'Thumbnail not available.' });
  }

  // Return thumbnail URL instead of streaming file
  if (image.thumbnailS3Key.startsWith('uploads/')) {
    // Local file - return local thumbnail URL
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/images/local-thumbnail/${id}`;
    res.json({
      downloadUrl,
      fileName: image.name,
      fileSize: image.size,
      fileType: image.fileType
    });
  } else {
    // S3 object - return presigned URL for direct thumbnail download
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: image.thumbnailS3Key,
    });

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    res.json({
      downloadUrl,
      fileName: image.name,
      fileSize: image.size,
      fileType: image.fileType
    });
  }
};

// New handler for local file downloads (serves the actual file)
export const localDownloadHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  // Only serve local files
  if (!image.s3Key.startsWith('uploads/')) {
    return res.status(404).json({ error: 'File not available for local download.' });
  }

  const localPath = path.join(process.cwd(), image.s3Key);

  // Check if file exists
  try {
    await fs.access(localPath);
  } catch {
    return res.status(404).json({ error: 'File not found on disk.' });
  }

  // Set headers and stream file
  res.setHeader('Content-Type', image.fileType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${image.name}"`);

  const fileStream = createReadStream(localPath);
  fileStream.pipe(res);
};

// New handler for local thumbnail downloads (serves the actual thumbnail file)
export const localThumbnailDownloadHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  if (!image.thumbnailS3Key || !image.thumbnailS3Key.startsWith('uploads/')) {
    return res.status(404).json({ error: 'Thumbnail not available for local download.' });
  }

  const localPath = path.join(process.cwd(), image.thumbnailS3Key);

  // Check if file exists
  try {
    await fs.access(localPath);
  } catch {
    return res.status(404).json({ error: 'Thumbnail not found on disk.' });
  }

  // Set headers and stream thumbnail file
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `inline; filename="${image.name}-thumb.jpg"`);

  const fileStream = createReadStream(localPath);
  fileStream.pipe(res);
};
