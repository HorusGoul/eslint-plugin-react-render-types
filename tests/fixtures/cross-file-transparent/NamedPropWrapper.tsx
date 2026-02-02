import type { ReactNode } from "react";

interface NamedPropWrapperProps {
  off?: ReactNode;
  children: ReactNode;
}

/** @transparent {off, children} */
export function NamedPropWrapper({ off, children }: NamedPropWrapperProps) {
  return <>{off ?? children}</>;
}
