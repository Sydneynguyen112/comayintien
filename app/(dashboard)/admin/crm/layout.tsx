import { CrmTabs } from "@/components/admin/crm-tabs";

export default function AdminCrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <CrmTabs />
      {children}
    </div>
  );
}
