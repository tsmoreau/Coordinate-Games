import { Storage } from "@google-cloud/storage";

let storageClient: Storage | null = null;

function getStorage(): Storage {
  if (!storageClient) {
    const projectId = process.env.GCS_PROJECT_ID;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing GCS environment variables (GCS_PROJECT_ID, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY)",
      );
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
    throw new Error("Missing GCS_BUCKET environment variable");
  }
  return bucket;
}

function getBucket() {
  return getStorage().bucket(getBucketName());
}

export interface FontMeta {
  fontId: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

function fontPath(fontId: string): string {
  return `fonts/${fontId}.fnt`;
}

export async function uploadFont(
  fontId: string,
  buffer: Buffer,
  originalName: string,
): Promise<FontMeta> {
  const bucket = getBucket();
  const file = bucket.file(fontPath(fontId));

  await file.save(buffer, {
    metadata: {
      contentType: "application/octet-stream",
      metadata: {
        originalName,
      },
    },
  });

  return {
    fontId,
    originalName,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteFont(fontId: string): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(fontPath(fontId));

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

export async function getFontBuffer(fontId: string): Promise<Buffer | null> {
  const bucket = getBucket();
  const file = bucket.file(fontPath(fontId));

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

export async function listFonts(): Promise<FontMeta[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: "fonts/" });

  const fonts: FontMeta[] = [];
  for (const file of files) {
    const name = file.name;
    if (!name.endsWith(".fnt")) continue;

    const fontId = name.replace("fonts/", "").replace(".fnt", "");
    const [metadata] = await file.getMetadata();

    fonts.push({
      fontId,
      originalName: String(metadata.metadata?.originalName || fontId),
      size: parseInt(String(metadata.size) || "0") || 0,
      uploadedAt: String(metadata.timeCreated || new Date().toISOString()),
    });
  }

  fonts.sort((a, b) => a.originalName.localeCompare(b.originalName));
  return fonts;
}
