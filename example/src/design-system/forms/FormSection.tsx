import { Separator } from "@/design-system/ui/separator";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

/** @transparent */
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <Separator className="mt-2" />
      </div>
      <div className="space-y-4 pl-1">{children}</div>
    </div>
  );
}
