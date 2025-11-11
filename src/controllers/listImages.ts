import ImageModel from '../models/Image';
import { isLocal } from '../utils/storage';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export const listImagesResolver = async (_: any, { search, bookmarkFilter, page, limit }: {
  search?: string,
  bookmarkFilter?: string,
  page?: number,
  limit?: number
}) => {
  const query: any = { deletedAt: { $exists: false } };

  // Search filter
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Bookmark filter
  if (bookmarkFilter === 'bookmarked') {
    query.bookmarked = true;
  } else if (bookmarkFilter === 'unbookmarked') {
    query.bookmarked = false;
  }
  // 'all' or undefined means no bookmark filter

  // Pagination
  const currentPage = Math.max(1, page || 1);
  const itemsPerPage = Math.min(10, Math.max(1, limit || 20)); // Max 10 items per page, default 20
  const skip = (currentPage - 1) * itemsPerPage;

  // Get total count
  const total = await ImageModel.countDocuments(query);

  // Get paginated results
  const images = await ImageModel
    .find(query)
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(itemsPerPage)
    .lean();

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  // Transform _id to id and add previewUrl
  for (const img of images) {
    const imgId = img._id.toHexString();
    (img as any).id = imgId;
    delete img._id;

    // Generate preview URL based on environment
    if (isLocal()) {
      // Local development: use local download endpoint
      (img as any).previewUrl = `http://localhost:3001/api/images/local-download/${imgId}`;
    } else {
      // Production: generate S3 presigned URL for viewing
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: img.s3Key
        });
        // Generate presigned URL (valid for 1 hour for viewing)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        (img as any).previewUrl = presignedUrl;
      } catch (error) {
        console.error('Error generating S3 presigned URL:', error);
        // Fallback to a placeholder or error URL
        (img as any).previewUrl = '';
      }
    }

    // Remove s3Key from response - don't expose internal storage details
    delete img.s3Key;

    // createdAt remains as Date, serialized by custom scalar
  }

  return {
    images,
    total,
    page: currentPage,
    limit: itemsPerPage,
    totalPages,
  };
};
