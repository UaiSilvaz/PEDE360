import DashboardShell from "@/components/dashboard-shell";
import Profile from "@/components/profile";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader title="Meu perfil" />
      <Profile />
    </DashboardShell>
  );
}
