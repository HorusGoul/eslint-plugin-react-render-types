/**
 * This file tests prop validation within a single file.
 * The interface and usage are in the same file, so validation works.
 */
import React from "react";

// Define MenuItem inline
function LocalMenuItem({ children }: { children: React.ReactNode }) {
  return <li className="menu-item">{children}</li>;
}

// Define Menu with @renders annotation on children
interface LocalMenuProps {
  /** @renders* {LocalMenuItem} */
  children: React.ReactNode;
}

function LocalMenu({ children }: LocalMenuProps) {
  return <ul className="menu">{children}</ul>;
}

// VALID: Using LocalMenuItem
export function ValidLocalMenu() {
  return (
    <LocalMenu>
      <LocalMenuItem>Item 1</LocalMenuItem>
      <LocalMenuItem>Item 2</LocalMenuItem>
    </LocalMenu>
  );
}

// INVALID: Using button instead of LocalMenuItem
export function InvalidLocalMenu() {
  return (
    <LocalMenu>
      <LocalMenuItem>Valid item</LocalMenuItem>
      {/* This should error - button is not LocalMenuItem */}
      <button>Not a menu item!</button>
    </LocalMenu>
  );
}
