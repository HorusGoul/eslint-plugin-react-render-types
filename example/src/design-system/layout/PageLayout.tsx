import { PageHeader } from "./PageHeader";
import { PageContent } from "./PageContent";

interface PageLayoutProps {
  /** @renders {PageHeader} */
  header: React.ReactNode;
  /** @renders {PageContent} */
  children: React.ReactNode;
}

export function PageLayout({ header, children }: PageLayoutProps) {
  return (
    <main className="flex-1 overflow-auto p-8">
      {header}
      {children}
    </main>
  );
}
