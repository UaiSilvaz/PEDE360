import DashboardShell from "@/components/dashboard-shell";
import Pos from "@/components/pos";
import { PageHeader } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { conversationId } = await searchParams;
  return (
    <DashboardShell>
      <PageHeader
        title="PDV / Balcão"
        description="Monte pedidos com adicionais e pagamento na entrega ou retirada."
      />
      <Pos conversationId={conversationId} />
    </DashboardShell>
  );
}
