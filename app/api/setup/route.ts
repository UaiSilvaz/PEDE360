import { db } from "@/lib/db";
import { endpoint, ok } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const products = await db.product.count({
    where: {
      merchantId: user.merchantId,
      active: true,
      OR: [{ categoryId: null }, { category: { active: true } }],
    },
  });
  return ok({
    hasProducts: products > 0,
    productCount: products,
    hasPhone: !!user.merchant.phone,
    hasIdentity: !!user.merchant.logoUrl,
    isOpen: user.merchant.isOpen,
  });
});
