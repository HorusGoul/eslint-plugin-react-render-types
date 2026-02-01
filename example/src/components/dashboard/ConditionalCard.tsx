import { DashboardCard } from "./DashboardCard";
import { StatCard } from "./StatCard";

interface ConditionalCardProps {
  show: boolean;
  title: string;
  value: string | number;
  change?: number;
}

/** @renders? {DashboardCard} */
export function ConditionalCard({ show, title, value, change }: ConditionalCardProps) {
  return show && <StatCard title={title} value={value} change={change} />;
}
