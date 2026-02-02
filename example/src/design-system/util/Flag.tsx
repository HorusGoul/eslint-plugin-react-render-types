import type { ReactNode } from "react";

interface FlagProps {
  name: string;
  off?: ReactNode;
  children: ReactNode;
}

/**
 * Feature flag wrapper — renders children when the flag is on,
 * the `off` prop when the flag is off.
 *
 * Both `off` and `children` are transparent: the plugin
 * validates the JSX passed to each slot.
 *
 * @transparent {off, children}
 */
export function Flag({ name, off, children }: FlagProps) {
  // Simulated flag check (always on for demo purposes)
  const isEnabled = name.length > 0;
  return <>{isEnabled ? children : off}</>;
}
