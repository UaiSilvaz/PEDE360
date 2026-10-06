import { endpoint, ok } from "@/lib/api";
import { authorize, logout } from "@/lib/security/auth";
export const GET = endpoint(async (request) => {
  const user = await authorize(request);
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    imageUrl: user.imageUrl,
    imageKey: user.imageKey,
    merchant: {
      id: user.merchantId,
      name: user.merchant.name,
      slug: user.merchant.slug,
      isOpen: user.merchant.isOpen,
    },
  });
});
export const DELETE = endpoint(async (request) => {
  await authorize(request);
  await logout();
  return ok(null);
});
