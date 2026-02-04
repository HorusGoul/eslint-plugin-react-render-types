import { NavItem } from "./NavItem";

interface NavItemsProps {
  links: string[];
}

/** @renders* {NavItem} */
export function NavItems({ links }: NavItemsProps) {
  return <>{links.map(link => <NavItem key={link} label={link} />)}</>;
}
