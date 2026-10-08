export const defaultAutoReply =
  "Olá! Confira nosso cardápio e faça seu pedido:";
export function autoReplyText(message: string, slug: string, appUrl: string) {
  const base = new URL(appUrl);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("APP_URL inválida");
  const link = new URL("/loja/" + encodeURIComponent(slug), base).href;
  return message.trim() + "\n\n" + link;
}
