import DashboardShell from "@/components/dashboard-shell";
import WhatsAppSettings from "@/components/whatsapp-settings";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Mais perto pelo WhatsApp"
        description="Comece pelo número da loja. É rápido e você pode ajustar depois."
      />
      <WhatsAppSettings />
    </DashboardShell>
  );
}
