import { NavLink } from "./NavLink";
import { Separator } from "@/design-system/ui/separator";

interface NavSectionItem {
  icon?: React.ReactNode;
  label: string;
  href: string;
}

interface NavSectionProps {
  title: string;
  items: NavSectionItem[];
}

export const NavSection = ({ title, items }: NavSectionProps) => {
  return (
    <div className="space-y-1">
      <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <Separator className="my-2" />
      {items.map((item) => (
        <NavLink
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
        />
      ))}
    </div>
  );
};
