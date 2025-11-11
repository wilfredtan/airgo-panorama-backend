import { Express } from "express";
import multer from 'multer';
import { downloadImageHandler } from './controllers/download';
import { getPresignedUrl } from './controllers/presigned';
import { completeUpload } from './controllers/completeUpload';
import { handleLocalUpload } from './controllers/localUpload';

// Configure multer for local upload endpoint
const localUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 50 * 1024 * 1024 // 50MB limit
	}
});

export const routes = (app: Express) => {
	// Presigned URL endpoint for large file uploads
	app.post('/api/images/presigned-url', getPresignedUrl);

	// Local upload endpoint for presigned URLs in development
	app.post('/api/images/local-upload/:uploadId', localUpload.single('file'), handleLocalUpload);

	// Complete upload endpoint for cloud S3 uploads
	app.post('/api/images/complete-upload', completeUpload);

	// Keep download as REST since GraphQL returns data, not files
	app.get('/api/images/:id/download', downloadImageHandler);
}
