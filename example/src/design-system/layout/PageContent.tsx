import { cn } from "@/lib/utils";

export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
