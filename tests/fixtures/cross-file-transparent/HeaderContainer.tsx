import { Header } from "./Header";

interface HeaderContainerProps {
  /** @renders* {Header} */
  children: React.ReactNode;
}

export function HeaderContainer({ children }: HeaderContainerProps) {
  return <div className="header-container">{children}</div>;
}
