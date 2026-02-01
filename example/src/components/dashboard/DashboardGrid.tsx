import { DashboardCard } from "./DashboardCard";
import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  /** @renders* {DashboardCard} */
  children: React.ReactNode;
  /** @renders? {StatCard | ChartCard} */
  highlight?: React.ReactNode;
  className?: string;
}

export function DashboardGrid({ children, highlight, className }: DashboardGridProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {highlight && (
        <div className="rounded-lg border-2 border-dashed border-primary/20 p-4">
          {highlight}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}
