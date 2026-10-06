import DashboardShell from "@/components/dashboard-shell";
import CatalogEditor from "@/components/catalog-editor";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Cardápio"
        description="Produtos, imagens e escolhas para cada pedido."
      />
      <CatalogEditor />
    </DashboardShell>
  );
}
