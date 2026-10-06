import test from "node:test";
import assert from "node:assert/strict";
import { menuAppearanceSchema, resolveAppearance, contrastRatio } from "../lib/menu-appearance";
test("menu appearance rejects CSS injection and unsupported fonts", () => {
  for (const backgroundColor of ["red", "#fff", "url(javascript:alert(1))", "#ffffff;display:none"]) assert(!menuAppearanceSchema.safeParse({backgroundColor}).success);
  assert(!menuAppearanceSchema.safeParse({fontFamily:"external-font"}).success);
});
test("menu appearance constrains sizes and formatting types", () => {
  assert(!menuAppearanceSchema.safeParse({fontSize:80}).success);
  assert(!menuAppearanceSchema.safeParse({cardRadius:-1}).success);
  assert(!menuAppearanceSchema.safeParse({boldTitles:"true"}).success);
});
test("existing menus keep safe defaults and their existing primary color", () => {
  const legacy=resolveAppearance(null,"#abcdef");assert.equal(legacy.buttonColor,"#abcdef");assert.equal(legacy.fontSize,16);
  const partial=resolveAppearance({backgroundColor:"#112233"});assert.equal(partial.backgroundColor,"#112233");assert.equal(partial.surfaceColor,"#ffffff");
  assert.equal(contrastRatio("#000000","#ffffff"),21);assert.equal(contrastRatio("#ffffff","#ffffff"),1);
});
