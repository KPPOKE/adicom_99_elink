import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = types[ext];
  if (!contentType || safeName !== filename) return new Response("Not found", { status: 404 });

  const target = path.resolve(UPLOAD_DIR, safeName);
  if (!target.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(target);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
