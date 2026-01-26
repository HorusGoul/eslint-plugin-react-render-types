import React from "react";

// =============================================================================
// Menu Design System Components
// =============================================================================

// Menu item - the base render type
export function MenuItem({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <li
      className={`menu-item ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      role="menuitem"
    >
      {children}
    </li>
  );
}

// Menu divider (not a MenuItem - should fail if used where MenuItem expected)
export function MenuDivider() {
  return <li className="menu-divider" role="separator" />;
}

// =============================================================================
// Specialized Menu Items (chained rendering)
// =============================================================================

/**
 * A menu item with an icon
 * @renders {MenuItem}
 */
export function IconMenuItem({
  icon,
  children,
  onClick,
}: {
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <MenuItem onClick={onClick}>
      <span className="icon">{icon}</span>
      {children}
    </MenuItem>
  );
}

/**
 * A destructive action menu item (e.g., Delete)
 * @renders {MenuItem}
 */
export function DangerMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <MenuItem onClick={onClick}>
      <span className="danger">{children}</span>
    </MenuItem>
  );
}

/**
 * A checkbox menu item
 * @renders {MenuItem}
 */
export function CheckboxMenuItem({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <MenuItem onClick={() => onChange(!checked)}>
      <span className="checkbox">{checked ? "✓" : "○"}</span>
      {children}
    </MenuItem>
  );
}

// =============================================================================
// Menu Container with Render Type Children
// =============================================================================

interface MenuProps {
  /**
   * Menu accepts zero or more MenuItems as children
   * @renders* {MenuItem}
   */
  children: React.ReactNode;
}

/**
 * A menu container that only accepts MenuItem children
 */
export function Menu({ children }: MenuProps) {
  return (
    <ul className="menu" role="menu">
      {children}
    </ul>
  );
}

// =============================================================================
// Dropdown Menu
// =============================================================================

interface DropdownMenuProps {
  trigger: React.ReactNode;
  /** @renders* {MenuItem} */
  children: React.ReactNode;
}

export function DropdownMenu({ trigger, children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="dropdown">
      <button onClick={() => setIsOpen(!isOpen)}>{trigger}</button>
      {isOpen && <Menu>{children}</Menu>}
    </div>
  );
}
