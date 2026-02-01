import { TextColumn } from "./TextColumn";
import { BadgeColumn } from "./BadgeColumn";

interface StatusColumnProps {
  header: string;
  value: string;
  showBadge: boolean;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/** @renders {TextColumn | BadgeColumn} */
export function StatusColumn({ header, value, showBadge, variant }: StatusColumnProps) {
  return showBadge ? (
    <BadgeColumn header={header} value={value} variant={variant} />
  ) : (
    <TextColumn header={header} value={value} />
  );
}
