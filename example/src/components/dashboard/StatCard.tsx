import { DashboardCard } from "./DashboardCard";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  description?: string;
}

/** @renders {DashboardCard} */
export const StatCard = ({ title, value, change, description }: StatCardProps) => (
  <DashboardCard title={title} description={description}>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold">{value}</span>
      {change != null && (
        <span
          className={`flex items-center text-sm ${change >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {change >= 0 ? (
            <TrendingUp className="mr-1 h-4 w-4" />
          ) : (
            <TrendingDown className="mr-1 h-4 w-4" />
          )}
          {change >= 0 ? "+" : ""}
          {change}%
        </span>
      )}
    </div>
  </DashboardCard>
);
