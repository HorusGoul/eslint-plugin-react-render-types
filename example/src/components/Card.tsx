import React from "react";

// =============================================================================
// Card Design System Components
// =============================================================================

// Base Card component
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

// Card subcomponents - these are the "primitive" render types
export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="card-footer">{children}</div>;
}

// =============================================================================
// Specialized Card Headers (chained rendering)
// =============================================================================

/**
 * A header with an icon - renders CardHeader
 * @renders {CardHeader}
 */
export function IconHeader({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <CardHeader>
      <span className="icon">{icon}</span>
      {children}
    </CardHeader>
  );
}

/**
 * A header with a title and subtitle - renders CardHeader
 * @renders {CardHeader}
 */
export function TitleHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <CardHeader>
      <h2>{title}</h2>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </CardHeader>
  );
}

/**
 * A dismissible header - chains through IconHeader -> CardHeader
 * @renders {CardHeader}
 */
export function DismissibleHeader({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <IconHeader icon="×">
      {children}
      <button onClick={onDismiss} className="dismiss-btn">
        Dismiss
      </button>
    </IconHeader>
  );
}

// =============================================================================
// Card Layout Component with Render Type Props
// =============================================================================

interface CardLayoutProps {
  /** @renders {CardHeader} */
  header: React.ReactNode;

  /** @renders? {CardFooter} */
  footer?: React.ReactNode;

  children: React.ReactNode;
}

/**
 * A card layout that enforces specific header and footer types
 */
export function CardLayout({ header, footer, children }: CardLayoutProps) {
  return (
    <Card>
      {header}
      <CardBody>{children}</CardBody>
      {footer}
    </Card>
  );
}
