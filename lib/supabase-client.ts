// Database types for Cloudflare D1 and R2

export interface Marker {
  id: string;
  title: string;
  marker_image_path: string;
  video_path: string;
  created_at: string;
}

export interface MarkerWithUrls {
  id: string;
  title: string;
  markerImageUrl: string;
  videoUrl: string;
  targetUrl?: string;
  createdAt: string;
}

// Cloudflare environment types
declare global {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
  }
}

// Helper function to get public URL for R2 objects
export function getPublicUrl(bucketName: string, filePath: string): string {
  // In production, this would be your R2 public URL
  // For local development, you might need to adjust this
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://your-r2-bucket.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : 'http://localhost:8787'; // Local dev server
  
  return `${baseUrl}/${bucketName}/${filePath}`;
}

// Database client
export const getDB = (env: Env) => env.DB;

// R2 Storage client
export const getBucket = (env: Env) => env.BUCKET;
