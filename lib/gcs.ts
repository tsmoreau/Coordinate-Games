import { Storage } from '@google-cloud/storage';

let storageClient: Storage | null = null;

function getStorage(): Storage {
  if (!storageClient) {
    const projectId = process.env.GCS_PROJECT_ID;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing GCS environment variables (GCS_PROJECT_ID, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY)');
    }

    storageClient = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }
  return storageClient;
}

function getBucketName(): string {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) {
    throw new Error('Missing GCS_BUCKET environment variable');
  }
  return bucket;
}

function getBucket() {
  return getStorage().bucket(getBucketName());
}

export async function uploadAvatar(
  gameSlug: string,
  avatarId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const bucket = getBucket();
  const filePath = `${gameSlug}/${avatarId}.png`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType },
  });

  return getAvatarUrl(gameSlug, avatarId);
}

export async function deleteAvatar(gameSlug: string, avatarId: string): Promise<void> {
  const bucket = getBucket();
  const filePath = `${gameSlug}/${avatarId}.png`;
  const file = bucket.file(filePath);

  try {
    await file.delete();
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error.code === 404) {
      return;
    }
    throw err;
  }
}

export function getAvatarUrl(gameSlug: string, avatarId: string): string {
  return `/api/avatars/${gameSlug}/${avatarId}`;
}

export async function getAvatarBuffer(gameSlug: string, avatarId: string): Promise<Buffer | null> {
  const bucket = getBucket();
  const filePath = `${gameSlug}/${avatarId}.png`;
  const file = bucket.file(filePath);

  try {
    const [buffer] = await file.download();
    return buffer;
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error.code === 404) {
      return null;
    }
    throw err;
  }
}
