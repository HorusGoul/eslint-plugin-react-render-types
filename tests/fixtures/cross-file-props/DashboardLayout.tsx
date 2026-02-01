import { NavItem } from "./NavItem";
import { NavSection } from "./NavSection";

interface DashboardLayoutProps {
  /** @renders* {NavItem | NavSection} */
  navigation: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ navigation, children }: DashboardLayoutProps) {
  return <div>{navigation}{children}</div>;
}
