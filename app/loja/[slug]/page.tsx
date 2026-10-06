import { notFound } from "next/navigation";
import { publicStore } from "@/lib/services/store";
import Storefront from "@/components/storefront";
import { menuStyle } from "@/lib/menu-appearance";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const store = await publicStore((await params).slug);
  if (!store) notFound();
  return (
    <div
      className="public-menu-page"
      style={menuStyle(store.appearance, store.primaryColor)}
    >
      <Storefront store={JSON.parse(JSON.stringify(store))} />
    </div>
  );
}
