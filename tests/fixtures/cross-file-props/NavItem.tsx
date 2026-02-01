export interface NavItemProps {
  label: string;
}

export function NavItem({ label }: NavItemProps) {
  return <button>{label}</button>;
}
