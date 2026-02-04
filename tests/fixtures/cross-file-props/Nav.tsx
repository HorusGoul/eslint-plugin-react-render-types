import { NavItem } from "./NavItem";
import { NavGroup } from "./NavGroup";

interface NavProps {
  /** @renders* {NavItem | NavGroup} */
  children: React.ReactNode;
}

export function Nav({ children }: NavProps) {
  return <nav>{children}</nav>;
}
