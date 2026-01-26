import React from "react";

// =============================================================================
// Tabs Design System Components
// =============================================================================

// Tab - the base render type
export function Tab({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <div data-tab-label={label}>{children}</div>;
}

// TabPanel - NOT a Tab (for testing invalid usage)
export function TabPanel({ children }: { children: React.ReactNode }) {
  return <div className="tab-panel">{children}</div>;
}

// =============================================================================
// Specialized Tabs (chained rendering)
// =============================================================================

/**
 * A tab with an icon in the label
 * @renders {Tab}
 */
export function IconTab({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return <Tab label={`${icon} ${label}`}>{children}</Tab>;
}

/**
 * A tab with a badge/count
 * @renders {Tab}
 */
export function BadgeTab({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return <Tab label={`${label} (${count})`}>{children}</Tab>;
}

/**
 * A closeable tab
 * @renders {Tab}
 */
export function CloseableTab({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tab label={label}>
      <button className="close-tab" onClick={onClose}>
        ×
      </button>
      {children}
    </Tab>
  );
}

// =============================================================================
// Tabs Container
// =============================================================================

interface TabsProps {
  /**
   * Tabs accepts one or more Tab as children
   * @renders* {Tab}
   */
  children: React.ReactNode;
  defaultTab?: number;
}

export function Tabs({ children, defaultTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const tabs = React.Children.toArray(children);

  return (
    <div className="tabs">
      <div className="tab-list" role="tablist">
        {tabs.map((tab, index) => {
          const label =
            React.isValidElement(tab) && tab.props["data-tab-label"];
          return (
            <button
              key={index}
              role="tab"
              aria-selected={activeTab === index}
              onClick={() => setActiveTab(index)}
            >
              {label || `Tab ${index + 1}`}
            </button>
          );
        })}
      </div>
      <div className="tab-content">{tabs[activeTab]}</div>
    </div>
  );
}
