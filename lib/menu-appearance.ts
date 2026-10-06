import { z } from "zod";
import type { CSSProperties } from "react";
const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB.");
export const menuAppearanceSchema = z.object({
  backgroundColor: hex.default("#f5f9f6"),
  surfaceColor: hex.default("#ffffff"),
  textColor: hex.default("#192e20"),
  buttonColor: hex.default("#078832"),
  buttonTextColor: hex.default("#ffffff"),
  coverColor: hex.default("#18d058"),
  fontFamily: z.enum(["modern", "rounded", "classic"]).default("modern"),
  fontSize: z.number().int().min(14).max(20).default(16),
  boldTitles: z.boolean().default(true),
  boldText: z.boolean().default(false),
  italicText: z.boolean().default(false),
  boldButtons: z.boolean().default(true),
  buttonRadius: z.number().int().min(0).max(30).default(12),
  cardRadius: z.number().int().min(0).max(24).default(12),
  buttonStyle: z.enum(["filled", "outline"]).default("filled"),
});
export type MenuAppearance = z.output<typeof menuAppearanceSchema>;
export const defaultAppearance = menuAppearanceSchema.parse({});
export function resolveAppearance(
  value: unknown,
  primaryColor?: string,
): MenuAppearance {
  const input =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = menuAppearanceSchema.safeParse({
    ...(primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor)
      ? { buttonColor: primaryColor }
      : {}),
    ...input,
  });
  return result.success ? result.data : { ...defaultAppearance };
}
export function contrastRatio(first: string, second: string) {
  function luminance(hex: string) {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function menuStyle(
  value: unknown,
  primaryColor?: string,
): CSSProperties {
  const a = resolveAppearance(value, primaryColor);
  const fonts = {
    modern: 'Inter, "Segoe UI", sans-serif',
    rounded: '"Trebuchet MS", sans-serif',
    classic: 'Georgia, "Times New Roman", serif',
  };
  return {
    "--bg": a.backgroundColor,
    "--panel": a.surfaceColor,
    "--text": a.textColor,
    "--muted": `color-mix(in srgb, ${a.textColor} 72%, ${a.surfaceColor})`,
    "--border": `color-mix(in srgb, ${a.textColor} 14%, ${a.surfaceColor})`,
    "--green": a.buttonColor,
    "--green-dark": a.buttonColor,
    "--green-soft": `color-mix(in srgb, ${a.buttonColor} 12%, ${a.surfaceColor})`,
    "--menu-cover": a.coverColor,
    "--menu-font": fonts[a.fontFamily],
    "--menu-size": `${a.fontSize}px`,
    "--menu-title-weight": a.boldTitles ? 750 : 500,
    "--menu-text-weight": a.boldText ? 700 : 400,
    "--menu-text-style": a.italicText ? "italic" : "normal",
    "--menu-button-weight": a.boldButtons ? 700 : 400,
    "--menu-button-radius": `${a.buttonRadius}px`,
    "--menu-card-radius": `${a.cardRadius}px`,
    "--menu-action-bg":
      a.buttonStyle === "outline" ? a.surfaceColor : a.buttonColor,
    "--menu-action-text":
      a.buttonStyle === "outline" ? a.buttonColor : a.buttonTextColor,
  } as CSSProperties;
}
