import { DataColumn } from "./DataColumn";
import { Button } from "@/design-system/ui/button";
import { MoreHorizontal } from "lucide-react";

interface ActionColumnProps {
  header: string;
  onAction?: () => void;
}

/** @renders {DataColumn} */
export const ActionColumn = ({ header, onAction }: ActionColumnProps) => (
  <DataColumn header={header}>
    <Button variant="ghost" size="icon" onClick={onAction}>
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DataColumn>
);
