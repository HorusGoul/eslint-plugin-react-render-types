import { NavItem } from "./NavItem";

interface SidebarProps {
  title: string;
  /** @renders* {NavItem} */
  children: React.ReactNode;
}

export function Sidebar({ title, children }: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">{title}</span>
      </div>
      <nav className="flex-1 space-y-4 p-3">{children}</nav>
    </aside>
  );
}
