import { DataColumn } from "./DataColumn";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/design-system/ui/table";

interface DataTableProps<T> {
  data: T[];
  /** @renders* {DataColumn} */
  children: React.ReactNode;
  columns: string[];
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  children,
  columns,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col}>{col}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((_, i) => (
          <TableRow key={i}>
            <TableCell colSpan={columns.length}>{children}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
