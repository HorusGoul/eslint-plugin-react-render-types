import type { ReactNode } from "react";

interface TransparentWrapperProps {
  children: ReactNode;
}

/** @transparent */
export function TransparentWrapper({ children }: TransparentWrapperProps) {
  return <div className="wrapper">{children}</div>;
}
