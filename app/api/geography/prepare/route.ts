import { after } from "next/server";
import { endpoint, ok, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { prepareDirectory } from "@/lib/geography/directory";
export const maxDuration = 300;
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const cityId = user.merchant.deliveryCityId;
  if (!cityId)
    throw new ApiError(
      400,
      "CITY",
      "Salve o estado e a cidade atendida primeiro.",
    );
  await rateLimit("directory:" + user.merchantId, 6, 3600);
  after(() => prepareDirectory(cityId));
  return ok({ preparing: true });
});
