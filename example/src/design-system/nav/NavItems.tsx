import { NavItem } from "./NavItem";

interface NavItemLink {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
}

interface NavItemsProps {
  links: NavItemLink[];
}

/** @renders* {NavItem} */
export function NavItems({ links }: NavItemsProps) {
  return (
    <>
      {links.map((link) => (
        <NavItem
          key={link.label}
          icon={link.icon}
          label={link.label}
          href={link.href}
          active={link.active}
        />
      ))}
    </>
  );
}
