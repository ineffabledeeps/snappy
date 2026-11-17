import { v2 as cloudinary } from 'cloudinary';

function configuredClient() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(true);
    cloudinary.config({ secure: true });
    return cloudinary;
  }

  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET');
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

export async function uploadPngBase64(base64, publicId) {
  const client = configuredClient();
  const result = await client.uploader.upload(`data:image/png;base64,${base64}`, {
    public_id: publicId,
    folder: 'snappy',
    resource_type: 'image',
    overwrite: true,
  });
  return result.secure_url;
}
