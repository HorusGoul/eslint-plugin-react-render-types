import { NavItem } from "./NavItem";

interface NavGroupProps {
  title: string;
  /** @renders* {NavItem} */
  children: React.ReactNode;
}

export function NavGroup({ title, children }: NavGroupProps) {
  return <div><h3>{title}</h3>{children}</div>;
}
