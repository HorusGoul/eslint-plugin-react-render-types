export interface DataColumnProps {
  header: string;
  children: React.ReactNode;
}

export function DataColumn({ children }: DataColumnProps) {
  return <>{children}</>;
}
