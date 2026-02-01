import { NavItem } from "./NavItem";

interface SidebarProps {
  /** @renders* {NavItem} */
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return <nav>{children}</nav>;
}
