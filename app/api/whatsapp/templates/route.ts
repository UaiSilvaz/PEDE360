import { endpoint, ok } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { listTemplates } from "@/lib/whatsapp/templates";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "whatsapp");
  return ok(await listTemplates(user.merchantId));
});
