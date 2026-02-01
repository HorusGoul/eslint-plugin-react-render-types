import { DashboardCard } from "./DashboardCard";

interface ChartCardProps {
  title: string;
  data: number[];
  description?: string;
}

/** @renders {DashboardCard} */
export const ChartCard = function ChartCard({
  title,
  data,
  description,
}: ChartCardProps) {
  const max = Math.max(...data, 1);

  return (
    <DashboardCard title={title} description={description}>
      <div className="flex h-32 items-end gap-1">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/80 transition-all hover:bg-primary"
            style={{ height: `${(value / max) * 100}%` }}
          />
        ))}
      </div>
    </DashboardCard>
  );
};
