import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Closest-to-pin photo storage. Serverless hosts (Vercel included) don't
// have a writable/persistent local filesystem, so in production this uses
// Vercel Blob. For local dev without a BLOB_READ_WRITE_TOKEN configured,
// it falls back to writing into public/uploads so the feature still works
// with zero setup.
export async function storePhoto(file: File): Promise<string> {
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${randomBytes(8).toString("hex")}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`ctp/${filename}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const uploadRoot = path.join(process.cwd(), "public", "uploads", "ctp");
  await mkdir(uploadRoot, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadRoot, filename), buffer);
  return `/uploads/ctp/${filename}`;
}
