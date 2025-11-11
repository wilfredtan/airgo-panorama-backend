import { Request, Response } from 'express';
import sharp from 'sharp';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import Image from '../models/Image';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export const completeUpload = async (req: Request, res: Response) => {
	try {
		const { key, bucket, originalName, size, type } = req.body;

		if (!key || !bucket || !originalName || !size || !type) {
			return res.status(400).json({
				error: 'Missing required fields: key, bucket, originalName, size, type'
			});
		}

		// Verify the file exists in S3
		const headCommand = new HeadObjectCommand({
			Bucket: bucket,
			Key: key
		});

		try {
			await s3Client.send(headCommand);
		} catch {
			return res.status(404).json({ error: 'Uploaded file not found in S3' });
		}

		// Get image metadata from S3
		let width = 0;
		let height = 0;
		let processedBuffer: Buffer | null = null;

		try {
			const getCommand = new GetObjectCommand({
				Bucket: bucket,
				Key: key
			});

			const s3Response = await s3Client.send(getCommand);
			if (!s3Response.Body) {
				throw new Error('No body in S3 response');
			}

			const stream = s3Response.Body as Readable;
			const chunks: Buffer[] = [];

			for await (const chunk of stream) {
				chunks.push(chunk);
			}

			const buffer = Buffer.concat(chunks);

			// Get image dimensions
			const metadata = await sharp(buffer).metadata();
			width = metadata.width || 0;
			height = metadata.height || 0;

			// Process image (resize if too large, add watermark, etc.)
			let processedImage = sharp(buffer);

			// Resize if width > 2048px (maintain aspect ratio)
			if (width > 2048) {
				processedImage = processedImage.resize(2048, null, {
					withoutEnlargement: true,
					fit: 'inside'
				});
				const newMetadata = await processedImage.metadata();
				width = newMetadata.width || width;
				height = newMetadata.height || height;
			}

			processedBuffer = await processedImage.jpeg({ quality: 85 }).toBuffer();

		} catch (error) {
			console.error('Error processing image:', error);
			// Continue without processing if Sharp fails
			width = 0;
			height = 0;
		}

		// Create database record
		const image = new Image({
			name: originalName,
			size: parseInt(size),
			width,
			height,
			fileType: type,
			s3Key: key
		});

		await image.save();

		// If we processed the image, update S3 with processed version
		if (processedBuffer) {
			// Could upload processed version back to S3 here if needed
			// For now, we'll keep the original
		}

		res.json({
			success: true,
			image: {
				id: image._id,
				name: image.name,
				size: image.size,
				width: image.width,
				height: image.height,
				fileType: image.fileType,
				uploadedAt: image.createdAt
			}
		});

	} catch (error) {
		console.error('Error completing upload:', error);
		res.status(500).json({ error: 'Failed to complete upload' });
	}
};
