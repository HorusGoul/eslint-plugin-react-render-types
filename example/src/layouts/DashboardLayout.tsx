import { Sidebar } from "@/design-system/nav/Sidebar";
import { NavItem } from "@/design-system/nav/NavItem";
import { NavSection } from "@/design-system/nav/NavSection";

interface DashboardLayoutProps {
  title: string;
  /** @renders* {NavItem | NavSection} */
  navigation: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ title, navigation, children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar title={title}>{navigation}</Sidebar>
      {children}
    </div>
  );
}
