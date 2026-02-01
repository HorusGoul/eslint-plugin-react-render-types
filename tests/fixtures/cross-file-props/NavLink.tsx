import { NavItem } from "./NavItem";

interface NavLinkProps {
  label: string;
}

/** @renders {NavItem} */
export function NavLink({ label }: NavLinkProps) {
  return <NavItem label={label} />;
}
