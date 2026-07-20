import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

type ImageSignature = {
  ext: "jpg" | "png" | "webp";
  mime: string;
  matches: (buffer: Buffer) => boolean;
};

const IMAGE_SIGNATURES: ImageSignature[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    matches: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  },
  {
    ext: "png",
    mime: "image/png",
    matches: (buffer) =>
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
  },
  {
    ext: "webp",
    mime: "image/webp",
    matches: (buffer) =>
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
  }
];

function detectImage(buffer: Buffer) {
  return IMAGE_SIGNATURES.find((signature) => signature.matches(buffer));
}

export async function saveImageUpload(file: File | null, prefix: string) {
  if (!file || file.size === 0) return undefined;
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Ukuran gambar maksimal 2MB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = detectImage(buffer);
  if (!image) throw new Error("Format gambar harus JPG, PNG, atau WebP");
  if (file.type && file.type !== image.mime) throw new Error("Tipe gambar tidak sesuai dengan isi file");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${prefix}-${Date.now()}-${randomUUID()}.${image.ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: "wx" });
  return `/api/uploads/${filename}`;
}

export async function deletePublicUpload(publicPath?: string | null) {
  if (!publicPath?.startsWith("/uploads/") && !publicPath?.startsWith("/api/uploads/")) return;
  const filename = path.basename(publicPath);
  const target = path.resolve(UPLOAD_DIR, filename);
  if (!target.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return;

  try {
    await unlink(target);
  } catch {
    // Missing files should not block form saves.
  }
}
