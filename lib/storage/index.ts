import "server-only";
import { ApiError } from "@/lib/api";
import { LocalProvider } from "./local-provider";
import { S3Provider } from "./s3-provider";
import { db } from "@/lib/db";
const variables = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_URL",
];
export function storage() {
  const configured = variables.filter((key) => process.env[key]);
  if (configured.length === variables.length) return new S3Provider();
  if (configured.length || process.env.NODE_ENV === "production")
    throw new ApiError(
      503,
      "STORAGE_CONFIGURATION",
      "Configuração necessária: storage S3.",
    );
  return new LocalProvider();
}
export async function ownedImage(
  merchantId: string,
  key?: string | null,
  url?: string | null,
) {
  if (!key && !url) return;
  if (
    !key ||
    !url ||
    !(await db.mediaAsset.findFirst({ where: { merchantId, key, url } }))
  )
    throw new ApiError(400, "IMAGE", "Imagem não pertence ao estabelecimento.");
}
export async function removeUnusedImage(
  merchantId: string,
  key?: string | null,
) {
  if (!key) return;
  const references = await Promise.all([
    db.product.count({ where: { merchantId, imageKey: key } }),
    db.category.count({ where: { merchantId, imageKey: key } }),
    db.merchant.count({
      where: {
        id: merchantId,
        OR: [{ logoKey: key }, { coverKey: key }, { imageKey: key }],
      },
    }),
    db.user.count({ where: { merchantId, imageKey: key } }),
    db.productImage.count({ where: { key, product: { merchantId } } }),
    db.campaign.count({ where: { merchantId, imageKey: key } }),
  ]);
  if (references.some(Boolean)) return;
  const asset = await db.mediaAsset.findFirst({ where: { merchantId, key } });
  if (asset) {
    await storage().delete(key);
    await db.mediaAsset.delete({ where: { id: asset.id } });
  }
}
export async function cleanupImage(merchantId: string, key?: string | null) {
  try {
    await removeUnusedImage(merchantId, key);
  } catch {
    console.error("storage_cleanup_failed");
  }
}
