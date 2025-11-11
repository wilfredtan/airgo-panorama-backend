import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import Image from '../models/Image';

export const handleLocalUpload = async (req: Request, res: Response) => {
	try {
		const file = req.file;
		if (!file) {
			return res.status(400).json({ error: 'No file provided' });
		}

		// Extract metadata from the request body (passed by frontend)
		const { originalName, size, type } = req.body;

		// Save file to local uploads directory
		const uploadId = req.params.uploadId;
		const fileName = `${uploadId}-${originalName || file.originalname}`;
		const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
		const filePath = path.join(uploadsDir, fileName);

		// Write file to disk
		await fs.writeFile(filePath, file.buffer);

		// Generate thumbnail
		let thumbnailPath: string | undefined;
		try {
			const thumbnailBuffer = await sharp(file.buffer)
				.resize(200, null, {
					withoutEnlargement: true
				})
				.jpeg({ quality: 80 })
				.toBuffer();

			const thumbnailFileName = `${uploadId}-${originalName || file.originalname}-thumb.jpg`;
			thumbnailPath = path.join(uploadsDir, thumbnailFileName);
			await fs.writeFile(thumbnailPath, thumbnailBuffer);
		} catch (error) {
			console.warn('Failed to generate thumbnail:', error);
		}
		let width = 0;
		let height = 0;

		try {
			const metadata = await sharp(file.buffer).metadata();
			width = metadata.width || 0;
			height = metadata.height || 0;
		} catch (error) {
			console.warn('Could not process image metadata:', error);
		}

		// Store relative path in s3Key for consistency with database schema
		const relativePath = path.join('uploads', 'images', fileName).replace(/\\/g, '/');
		const thumbnailRelativePath = thumbnailPath ? path.relative(process.cwd(), thumbnailPath).replace(/\\/g, '/') : undefined;

		// Create database record
		const image = new Image({
			name: originalName || file.originalname,
			size: parseInt(size) || file.size,
			width,
			height,
			fileType: type || file.mimetype,
			s3Key: relativePath,
			thumbnailS3Key: thumbnailRelativePath
		});

		await image.save();

		res.json({
			success: true,
			message: 'File uploaded successfully',
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
		console.error('Local upload error:', error);
		res.status(500).json({ error: 'Failed to upload file locally' });
	}
};
