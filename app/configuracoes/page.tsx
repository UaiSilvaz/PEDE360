import DashboardShell from "@/components/dashboard-shell";
import { PageHeader } from "@/components/ui";
import SettingsForm from "@/components/settings-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  return (
    <DashboardShell>
      <PageHeader
        title="Sua loja, do seu jeito"
        description="Ajuste o que precisar. Um passo de cada vez."
      />
      <SettingsForm initialTab={section} />
    </DashboardShell>
  );
}
