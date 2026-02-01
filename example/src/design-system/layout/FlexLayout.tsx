import { PageHeader } from "./PageHeader";
import { PageContent } from "./PageContent";

interface FlexLayoutProps {
  /** @renders {PageHeader | PageContent} */
  header: React.ReactNode;
  children: React.ReactNode;
}

export function FlexLayout({ header, children }: FlexLayoutProps) {
  return (
    <main className="flex-1 overflow-auto p-8">
      {header}
      <div className="mt-6">{children}</div>
    </main>
  );
}
