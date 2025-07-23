import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,      // e.g. https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
export const BUCKET = process.env.R2_BUCKET!;

// Helper: build full public URL for a key stored in the default bucket
export const getPublicUrl = (key: string) => {
  const endpoint = process.env.R2_PUBLIC_ENDPOINT || process.env.R2_ENDPOINT!;
  return `${endpoint.replace(/\/$/, "")}/${BUCKET}/${key}`;
};

// Upload a file buffer to R2
export const uploadFile = async (
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType = "application/octet-stream",
) => {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2.send(cmd);
  return { key };
};

// Delete a single object
export const deleteObject = async (key: string) => {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

// List objects optionally filtered by prefix (max 1000 results)
export const listObjects = async (prefix = "") => {
  const { Contents } = await r2.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
  );
  return Contents || [];
};