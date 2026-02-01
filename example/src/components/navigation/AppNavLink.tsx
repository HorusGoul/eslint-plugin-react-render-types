import { NavItem } from "@/design-system/nav/NavItem";
import { NavLink } from "@/design-system/nav/NavLink";
import { ExternalLink } from "lucide-react";

interface AppNavLinkProps {
  label: string;
  href: string;
  active?: boolean;
}

/** @renders {NavItem} */
export function AppNavLink({ label, href, active }: AppNavLinkProps) {
  return (
    <NavLink
      icon={<ExternalLink className="h-4 w-4" />}
      label={label}
      href={href}
      active={active}
    />
  );
}
