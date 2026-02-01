import { DashboardCard } from "./DashboardCard";
import { StatCard } from "./StatCard";

interface StatItem {
  title: string;
  value: string | number;
  change?: number;
}

interface MultiCardProps {
  items: StatItem[];
}

/** @renders* {DashboardCard} */
export function MultiCard({ items }: MultiCardProps) {
  return (
    <>
      {items.map((item) => (
        <StatCard
          key={item.title}
          title={item.title}
          value={item.value}
          change={item.change}
        />
      ))}
    </>
  );
}
