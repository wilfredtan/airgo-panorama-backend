import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import { isLocal } from '../utils/storage';
import { promises as fs } from 'fs';
import path from 'path';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export const getPresignedUrl = async (req: Request, res: Response) => {
	try {
		const { fileName, fileType, fileSize } = req.body;

		if (!fileName || !fileType || !fileSize) {
			return res.status(400).json({
				error: 'Missing required fields: fileName, fileType, fileSize'
			});
		}

		// Validate file size (max 50MB for S3, same for local)
		const maxSize = 50 * 1024 * 1024; // 50MB
		if (fileSize > maxSize) {
			return res.status(400).json({
				error: 'File size exceeds maximum allowed size of 50MB'
			});
		}

		if (isLocal()) {
			// For local development, generate a local upload endpoint
			const uploadId = Date.now().toString();
			const localUploadPath = `/api/images/local-upload/${uploadId}`;

			// Ensure the uploads directory exists
			const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
			await fs.mkdir(uploadsDir, { recursive: true });

			res.json({
				presignedUrl: localUploadPath,
				key: `local-${uploadId}`,
				bucket: 'local-storage',
				isLocal: true
			});
		} else {
			// Cloud deployment - use S3 presigned URLs
			const key = `uploads/${Date.now()}-${fileName}`;

			const command = new PutObjectCommand({
				Bucket: process.env.BUCKET_NAME,
				Key: key,
				ContentType: fileType,
				Metadata: {
					originalName: fileName,
					size: fileSize.toString()
				}
			});

			// Generate presigned URL (valid for 15 minutes)
			const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

			res.json({
				presignedUrl,
				key,
				bucket: process.env.BUCKET_NAME
			});
		}

	} catch (error) {
		console.error('Error generating presigned URL:', error);
		res.status(500).json({ error: 'Failed to generate upload URL' });
	}
};
