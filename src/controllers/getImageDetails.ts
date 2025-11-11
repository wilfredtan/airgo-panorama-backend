import ImageModel from '../models/Image';

export const getImageDetailsResolver = async (_: any, { id }: { id: string }) => {
  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!image) {
    throw new Error('Image not found');
  }
  return {
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
};
