import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyRequest } from 'fastify';

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });

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
  uploadDirectory: string,
  publicApiBaseUrl: string,
) => {
  const savedPaths: string[] = [];
  const urls: string[] = [];
  const normalizedBaseUrl = publicApiBaseUrl.replace(/\/+$/, '');

  await mkdir(uploadDirectory, { recursive: true });

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
      const filePath = path.join(uploadDirectory, filename);
      await writeFile(filePath, buffer, { flag: 'wx' });
      savedPaths.push(filePath);
      urls.push(`${normalizedBaseUrl}/api/uploads/products/${filename}`);
    }

    if (!urls.length) throw httpError(400, 'Select at least one product image.');
    if (urls.length > MAX_PRODUCT_IMAGES) {
      throw httpError(413, `You can upload up to ${MAX_PRODUCT_IMAGES} product images.`);
    }

    return urls;
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => unlink(filePath).catch(() => undefined)));
    throw error;
  }
};
