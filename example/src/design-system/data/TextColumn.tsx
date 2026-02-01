import { DataColumn } from "./DataColumn";

interface TextColumnProps {
  header: string;
  value: string;
}

/** @renders {DataColumn} */
export function TextColumn({ header, value }: TextColumnProps) {
  return (
    <DataColumn header={header}>
      <span className="text-sm">{value}</span>
    </DataColumn>
  );
}
