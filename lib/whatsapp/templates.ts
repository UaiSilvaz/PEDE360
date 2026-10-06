import { graph, integration } from "./client";
import type { WhatsAppTemplate } from "./types";
export async function listTemplates(merchantId: string) {
  const config = await integration(merchantId);
  const result: WhatsAppTemplate[] = [];
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const response = await graph<{
      data: WhatsAppTemplate[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(
      config.token,
      config.wabaId +
        "/message_templates?limit=100" +
        (after ? "&after=" + encodeURIComponent(after) : ""),
    );
    result.push(...response.data);
    if (!response.paging?.next) break;
    after = response.paging.cursors?.after;
    if (!after) break;
  }
  return result;
}
