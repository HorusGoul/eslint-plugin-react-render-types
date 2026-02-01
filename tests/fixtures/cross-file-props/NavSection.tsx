interface NavSectionProps {
  title: string;
}

export function NavSection({ title }: NavSectionProps) {
  return <div>{title}</div>;
}
