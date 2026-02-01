import { NavItem } from "./NavItem";

interface NavLinkProps {
  icon?: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

/** @renders {NavItem} */
export function NavLink({ icon, label, href, active }: NavLinkProps) {
  return <NavItem icon={icon} label={label} href={href} active={active} />;
}
