import { Express } from "express";
import multer from 'multer';
import { downloadImageHandler, localDownloadHandler, thumbnailDownloadHandler, localThumbnailDownloadHandler } from './controllers/download';
import { getPresignedUrl } from './controllers/presigned';
import { completeUpload } from './controllers/completeUpload';
import { handleLocalUpload } from './controllers/localUpload';

// Configure multer for local upload endpoint
const localUpload = multer({
  storage: multer.memoryStorage(),
});

export const routes = (app: Express) => {
  // Presigned URL endpoint for large file uploads
  app.post('/api/images/presigned-url', getPresignedUrl);

  // Local upload endpoint for presigned URLs in development
  app.post('/api/images/local-upload/:uploadId', localUpload.single('file'), handleLocalUpload);

  // Complete upload endpoint for cloud S3 uploads
  app.post('/api/images/complete-upload', completeUpload);

  // Download endpoints - return URLs instead of streaming files
  app.get('/api/images/:id/download', downloadImageHandler);
  app.get('/api/images/local-download/:id', localDownloadHandler);
  app.get('/api/images/:id/thumbnail', thumbnailDownloadHandler);
  app.get('/api/images/local-thumbnail/:id', localThumbnailDownloadHandler);
}
