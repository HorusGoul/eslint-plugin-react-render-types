import { DashboardCard } from "./DashboardCard";
import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";

type CardType = "stat" | "chart";

const cardRegistry: Record<CardType, React.FC<{ title: string }>> = {
  stat: ({ title }) => <StatCard title={title} value="—" />,
  chart: ({ title }) => <ChartCard title={title} data={[]} />,
};

interface DynamicCardProps {
  type: CardType;
  title: string;
}

/** @renders! {DashboardCard} */
export const DynamicCard = function DynamicCard({ type, title }: DynamicCardProps) {
  const CardComponent = cardRegistry[type];
  return <CardComponent title={title} />;
};
