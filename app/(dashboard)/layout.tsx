import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardClientLayout } from "./DashboardClientLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardClientLayout>
        {children}
      </DashboardClientLayout>
    </AuthProvider>
  );
}
