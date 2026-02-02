import type { ReactNode } from "react";

interface NonTransparentWrapperProps {
  children: ReactNode;
}

export function NonTransparentWrapper({ children }: NonTransparentWrapperProps) {
  return <div className="wrapper">{children}</div>;
}
