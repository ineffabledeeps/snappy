import { v2 as cloudinary } from 'cloudinary';

export function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

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
    throw new Error('Cloudinary is not configured');
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

/** Upload PNG base64; returns { url, publicId } or throws. */
export async function uploadPngBase64(base64, publicId = `snappy-${Date.now()}`) {
  const client = configuredClient();
  const result = await client.uploader.upload(`data:image/png;base64,${base64}`, {
    public_id: publicId,
    folder: 'snappy',
    resource_type: 'image',
    overwrite: true,
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}
