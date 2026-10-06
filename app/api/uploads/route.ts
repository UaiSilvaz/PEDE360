import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { ApiError, endpoint, ok, json, readBody } from "@/lib/api";
import { can } from "@/lib/security/permissions";
import { authorize } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { storage, removeUnusedImage } from "@/lib/storage";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const user = await authorize(request);
  await rateLimit("upload:" + user.id, 30, 60);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 5 * 1024 * 1024 + 65536)
    throw new ApiError(413, "FILE_SIZE", "Limite de 5 MB.");
  const body = await readBody(request, 5 * 1024 * 1024 + 65536);
  const form = await new Response(body, {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
  const file = form.get("file");
  const folder = z
    .enum([
      "products",
      "categories",
      "logos",
      "covers",
      "establishment",
      "profile",
      "campaigns",
    ])
    .parse(form.get("folder"));
  if (
    folder !== "profile" &&
    !can(
      user.role,
      ["logos", "covers", "establishment"].includes(folder)
        ? "settings"
        : "catalog",
    )
  )
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Sem permissão para enviar esta imagem.",
    );
  if (
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new ApiError(400, "FILE_TYPE", "Use JPEG, PNG ou WEBP.");
  if (file.size > 5 * 1024 * 1024 || file.size === 0)
    throw new ApiError(413, "FILE_SIZE", "Limite de 5 MB.");
  let output: Buffer;
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25_000_000,
      failOn: "error",
    });
    const info = await source.metadata();
    if (
      !["jpeg", "png", "webp"].includes(info.format || "") ||
      (info.pages || 1) > 1
    )
      throw new Error("Invalid image");
    output = await source
      .rotate()
      .resize({
        width: folder === "covers" ? 1920 : 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 83 })
      .toBuffer();
  } catch {
    throw new ApiError(
      400,
      "INVALID_IMAGE",
      "O arquivo não contém uma imagem válida.",
    );
  }
  const name =
    file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 48) || "image";
  const key =
    user.merchantId + "/" + folder + "/" + name + "-" + randomUUID() + ".webp";
  const uploaded = await storage().upload(key, output, "image/webp");
  try {
    await db.mediaAsset.create({
      data: { merchantId: user.merchantId, folder, ...uploaded },
    });
  } catch (error) {
    await storage().delete(key);
    throw error;
  }
  return ok({ imageKey: key, imageUrl: uploaded.url }, 201);
});
export const DELETE = endpoint(async (request) => {
  const user = await authorize(request, "catalog");
  const { key } = z.object({ key: z.string() }).parse(await json(request));
  await removeUnusedImage(user.merchantId, key);
  return ok(null);
});
