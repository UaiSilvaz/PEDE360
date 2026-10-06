"use client";
import { useResource, ResourceState } from "./shared/resource";
import type { SessionView, Store } from "@/lib/view-types";
import Storefront from "./storefront";
function PosStore({
  slug,
  conversationId,
}: {
  slug: string;
  conversationId?: string;
}) {
  const resource = useResource<Store>("/api/store/" + slug);
  if (!resource.data)
    return <ResourceState {...resource} retry={resource.refresh} />;
  return (
    <Storefront store={resource.data} admin conversationId={conversationId} />
  );
}
export default function Pos({ conversationId }: { conversationId?: string }) {
  const resource = useResource<SessionView>("/api/auth/me");
  return resource.data ? (
    <PosStore
      slug={resource.data.merchant.slug}
      conversationId={conversationId}
    />
  ) : (
    <ResourceState {...resource} retry={resource.refresh} />
  );
}
