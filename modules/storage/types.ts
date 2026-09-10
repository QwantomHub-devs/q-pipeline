export type StorageBucket =
  | 'resumes'
  | 'certificates'
  | 'contracts'
  | 'module3_videos';

export interface BucketConfig {
  bucket: StorageBucket;
  isPrivate: boolean;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export const BUCKET_CONFIGS: Record<StorageBucket, BucketConfig> = {
  resumes: {
    bucket: 'resumes',
    isPrivate: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  certificates: {
    bucket: 'certificates',
    isPrivate: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  contracts: {
    bucket: 'contracts',
    isPrivate: true,
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['application/pdf'],
  },
  module3_videos: {
    bucket: 'module3_videos',
    isPrivate: true,
    maxSizeBytes: 250 * 1024 * 1024, // 250MB
    allowedMimeTypes: ['video/mp4', 'video/webm'],
  },
};

export interface FileUploadRequest {
  bucket: StorageBucket;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  targetClerkUserId: string;
}

export interface SignedUploadUrlResult {
  signedUrl: string;
  token: string;
  path: string;
  expiresAt: number;
}

export interface SignedDownloadUrlResult {
  signedUrl: string;
  expiresAt: number;
}
