import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyRequest } from 'fastify';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { env } from '../../config/env.js';

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });

interface LocalProductImageStorageOptions {
  uploadDirectory: string;
  publicApiBaseUrl: string;
}

const localProductImageUrlPathPrefix = '/api/uploads/products/';

const normalizeCloudinaryFolder = () => env.CLOUDINARY_UPLOAD_FOLDER.replace(/^\/+|\/+$/g, '');

const getProductImageStorageProvider = () =>
  env.PRODUCT_IMAGE_STORAGE ?? (env.NODE_ENV === 'production' ? 'cloudinary' : 'local');

const getMissingCloudinaryConfig = () => {
  const missing = [];
  if (!env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  return missing;
};

const ensureCloudinaryConfigured = () => {
  const missing = getMissingCloudinaryConfig();
  if (missing.length) {
    throw Object.assign(new Error('Persistent product image storage is not configured.'), {
      statusCode: 503,
      details: { missing },
    });
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME!,
    api_key: env.CLOUDINARY_API_KEY!,
    api_secret: env.CLOUDINARY_API_SECRET!,
    secure: true,
  });
};

const uploadProductImageToCloudinary = async (buffer: Buffer): Promise<string> => {
  ensureCloudinaryConfigured();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: normalizeCloudinaryFolder(),
        public_id: randomUUID(),
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        allowed_formats: ['jpg', 'jpeg', 'png'],
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        if (!response?.secure_url) {
          reject(Object.assign(new Error('Cloud image upload did not return a secure URL.'), { statusCode: 502 }));
          return;
        }
        resolve(response);
      },
    );

    stream.end(buffer);
  });

  return result.secure_url;
};

export const getCloudinaryPublicIdFromUrl = (imageUrl: string) => {
  if (!env.CLOUDINARY_CLOUD_NAME) return null;

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  const marker = `/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  let afterUpload: string;
  try {
    afterUpload = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
  const parts = afterUpload.split('/').filter(Boolean);
  const versionlessParts = parts[0] && /^v\d+$/.test(parts[0]) ? parts.slice(1) : parts;
  if (!versionlessParts.length) return null;

  const filename = versionlessParts.at(-1)!;
  const extensionIndex = filename.lastIndexOf('.');
  if (extensionIndex <= 0) return null;

  versionlessParts[versionlessParts.length - 1] = filename.slice(0, extensionIndex);
  const publicId = versionlessParts.join('/');
  const folder = normalizeCloudinaryFolder();
  return publicId === folder || publicId.startsWith(`${folder}/`) ? publicId : null;
};

const getLocalProductImagePath = (
  imageUrl: string,
  { uploadDirectory, publicApiBaseUrl }: LocalProductImageStorageOptions,
) => {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  const normalizedBase = publicApiBaseUrl.replace(/\/+$/, '');
  const normalizedUrl = `${parsed.origin}${parsed.pathname}`;
  const expectedPrefix = `${normalizedBase}${localProductImageUrlPathPrefix}`;
  if (!normalizedUrl.startsWith(expectedPrefix)) return null;

  const filename = normalizedUrl.slice(expectedPrefix.length);
  if (!/^[a-f0-9-]+\.(jpg|png)$/i.test(filename)) return null;
  return path.join(uploadDirectory, filename);
};

const deleteImageUrls = async (
  urls: string[],
  localOptions: LocalProductImageStorageOptions,
) => {
  const uniqueUrls = [...new Set(urls)];
  await Promise.all(uniqueUrls.map(async (url) => {
    const publicId = getCloudinaryPublicIdFromUrl(url);
    if (publicId) {
      ensureCloudinaryConfigured();
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
      return;
    }

    const localPath = getLocalProductImagePath(url, localOptions);
    if (localPath) {
      await unlink(localPath).catch(() => undefined);
    }
  }));
};

// Callers must establish application ownership before invoking this helper.
export const deleteOwnedProductImageUrls = deleteImageUrls;

export const detectProductImageExtension = (buffer: Buffer) => {
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) return 'png';

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  if (isJpeg) return 'jpg';

  return null;
};

export const saveProductImages = async (
  request: FastifyRequest,
  localOptions: LocalProductImageStorageOptions,
) => {
  const savedPaths: string[] = [];
  const uploadedCloudinaryUrls: string[] = [];
  const urls: string[] = [];
  const normalizedBaseUrl = localOptions.publicApiBaseUrl.replace(/\/+$/, '');
  const storageProvider = getProductImageStorageProvider();

  if (storageProvider === 'local') {
    await mkdir(localOptions.uploadDirectory, { recursive: true });
  }

  try {
    for await (const part of request.files()) {
      if (part.fieldname !== 'images') {
        throw httpError(400, 'Only the images upload field is accepted.');
      }
      if (!allowedMimeTypes.has(part.mimetype)) {
        throw httpError(400, 'Product images must be JPG, JPEG, or PNG files.');
      }

      const buffer = await part.toBuffer();
      if (!buffer.length) throw httpError(400, 'Product images cannot be empty.');
      if (buffer.length > MAX_PRODUCT_IMAGE_SIZE_BYTES || part.file.truncated) {
        throw httpError(413, 'Each product image must be 5 MB or smaller.');
      }

      const extension = detectProductImageExtension(buffer);
      const mimeMatchesContent =
        (extension === 'png' && part.mimetype === 'image/png') ||
        (extension === 'jpg' && (part.mimetype === 'image/jpeg' || part.mimetype === 'image/jpg'));
      if (!extension || !mimeMatchesContent) {
        throw httpError(400, 'The uploaded file content must be a valid JPG, JPEG, or PNG image.');
      }

      const filename = `${randomUUID()}.${extension}`;
      if (storageProvider === 'cloudinary') {
        const cloudinaryUrl = await uploadProductImageToCloudinary(buffer);
        uploadedCloudinaryUrls.push(cloudinaryUrl);
        urls.push(cloudinaryUrl);
      } else {
        const filePath = path.join(localOptions.uploadDirectory, filename);
        await writeFile(filePath, buffer, { flag: 'wx' });
        savedPaths.push(filePath);
        urls.push(`${normalizedBaseUrl}${localProductImageUrlPathPrefix}${filename}`);
      }
    }

    if (!urls.length) throw httpError(400, 'Select at least one product image.');
    if (urls.length > MAX_PRODUCT_IMAGES) {
      throw httpError(413, `You can upload up to ${MAX_PRODUCT_IMAGES} product images.`);
    }

    return urls;
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => unlink(filePath).catch(() => undefined)));
    await deleteImageUrls(uploadedCloudinaryUrls, localOptions).catch(() => undefined);
    throw error;
  }
};
