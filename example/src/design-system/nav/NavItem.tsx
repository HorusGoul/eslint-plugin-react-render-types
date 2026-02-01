import { cn } from "@/lib/utils";
import { Button } from "@/design-system/ui/button";

export interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
}

export function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      asChild={!!href}
      className={cn(
        "w-full justify-start gap-3 px-3",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      {href ? (
        <a href={href}>
          {icon}
          <span>{label}</span>
        </a>
      ) : (
        <span>
          {icon}
          <span>{label}</span>
        </span>
      )}
    </Button>
  );
}
