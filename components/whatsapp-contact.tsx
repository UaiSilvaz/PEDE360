import { whatsappLink } from "@/lib/whatsapp/link";
const message =
  "Ol\u00e1! \ud83d\udc4b Gostaria de saber mais sobre o PEDE360 e como usar o card\u00e1pio digital na minha loja. \ud83d\udcf2\ud83d\udfe2";
export default function WhatsAppContact({ phone }: { phone: string }) {
  const href = whatsappLink(phone, message);
  if (!href) return null;
  return (
    <a
      className="lp-whatsapp-contact"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar sobre o PEDE360 no WhatsApp"
    >
      <span className="lp-whatsapp-tooltip">Vamos conversar?</span>
      <svg viewBox="0 0 64 64" role="img" aria-label="WhatsApp">
        <path
          d="M32 5a26 26 0 0 0-22.3 39.4L5 59l15-4.3A26 26 0 1 0 32 5Z"
          fill="#00d968"
          stroke="#fff"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M23 18c-1-2-2-2-3-2h-2c-1 0-4 4-4 8 0 5 4 11 10 16 5 4 10 6 14 6 4 0 8-3 9-6 .5-2 .5-3-.5-3.5l-7-3.5c-1-.5-2-.5-2.5.5l-3 3c-.5.5-1 .5-2 .1-4-2-7-5-9-8-.5-1-.5-1.5.2-2.2l2-2c.5-.5.7-1.5.3-2.3Z"
          fill="#fff"
          transform="translate(3 1) scale(.94)"
        />
      </svg>
    </a>
  );
}
