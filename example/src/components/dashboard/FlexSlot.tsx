import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";

interface FlexSlotProps {
  variant: "stat" | "chart";
  title: string;
  statValue?: string | number;
  statChange?: number;
  chartData?: number[];
  description?: string;
}

/** @renders {StatCard | ChartCard} */
export function FlexSlot({
  variant,
  title,
  statValue = "—",
  statChange,
  chartData = [],
  description,
}: FlexSlotProps) {
  return variant === "stat" ? (
    <StatCard title={title} value={statValue} change={statChange} description={description} />
  ) : (
    <ChartCard title={title} data={chartData} description={description} />
  );
}
