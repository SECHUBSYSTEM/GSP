import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export function configureCloudinary(): void {
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder = 'gsp-documents'
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new AppError('CLOUDINARY_NOT_CONFIGURED');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', public_id: filename.replace(/\.[^/.]+$/, '') },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export function createMockUploadUrl(type: string, applicationId: string): string {
  return `https://placeholder.local/${applicationId}/${type}/${Date.now()}`;
}
