import { DataColumn } from "./DataColumn";
import { Badge } from "@/design-system/ui/badge";

interface BadgeColumnProps {
  header: string;
  value: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/** @renders {DataColumn} */
export const BadgeColumn = ({ header, value, variant = "default" }: BadgeColumnProps) => {
  return (
    <DataColumn header={header}>
      <Badge variant={variant}>{value}</Badge>
    </DataColumn>
  );
};
