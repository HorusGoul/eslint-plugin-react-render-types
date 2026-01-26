/**
 * This file demonstrates INVALID usage of render types.
 * Each example here should produce an ESLint error.
 *
 * Run `pnpm lint` to see the errors.
 */
import React from "react";
import {
  // Card components
  CardLayout,
  CardHeader,
  CardFooter,
  CardBody,
  // Menu components
  Menu,
  MenuItem,
  MenuDivider,
  // Tab components
  Tabs,
  Tab,
  TabPanel,
} from "../components";

// =============================================================================
// Invalid Card Examples
// =============================================================================

/**
 * ERROR: CardLayout.header expects @renders {CardHeader}
 * but receives CardFooter
 */
export function WrongHeaderType() {
  return (
    <CardLayout
      // @ts-expect-error - demonstrating lint error
      header={<CardFooter>This is a footer, not a header!</CardFooter>}
    >
      Content
    </CardLayout>
  );
}

/**
 * ERROR: CardLayout.header expects @renders {CardHeader}
 * but receives a div
 */
export function PrimitiveHeader() {
  return (
    <CardLayout
      // @ts-expect-error - demonstrating lint error
      header={<div>Just a div</div>}
    >
      Content
    </CardLayout>
  );
}

/**
 * ERROR: CardLayout.footer expects @renders? {CardFooter}
 * but receives CardHeader (wrong type, even though it's optional)
 */
export function WrongFooterType() {
  return (
    <CardLayout
      header={<CardHeader>Header</CardHeader>}
      // @ts-expect-error - demonstrating lint error
      footer={<CardHeader>This should be a footer!</CardHeader>}
    >
      Content
    </CardLayout>
  );
}

/**
 * ERROR: A component declaring @renders {CardHeader}
 * but returning CardBody
 *
 * @renders {CardHeader}
 */
function BrokenHeader() {
  // This should error - returns CardBody instead of CardHeader
  return <CardBody>Oops, wrong component</CardBody>;
}

// =============================================================================
// Invalid Menu Examples
// =============================================================================

/**
 * ERROR: Menu.children expects @renders* {MenuItem}
 * but receives MenuDivider (which is NOT a MenuItem)
 */
export function MenuWithDivider() {
  return (
    <Menu>
      <MenuItem>Item 1</MenuItem>
      {/* MenuDivider is NOT a MenuItem - this should error */}
      <MenuDivider />
      <MenuItem>Item 2</MenuItem>
    </Menu>
  );
}

/**
 * ERROR: Menu.children expects @renders* {MenuItem}
 * but receives a button
 */
export function MenuWithButton() {
  return (
    <Menu>
      <MenuItem>Valid item</MenuItem>
      {/* A button is not a MenuItem */}
      <button>Not a menu item</button>
    </Menu>
  );
}

/**
 * ERROR: A component declaring @renders {MenuItem}
 * but returning null
 *
 * @renders {MenuItem}
 */
function BrokenMenuItem() {
  // Required @renders cannot return null
  return null;
}

/**
 * ERROR: A component declaring @renders {MenuItem}
 * but returning a div
 *
 * @renders {MenuItem}
 */
function DivMenuItem() {
  // Must return MenuItem, not a div
  return <div>Not a MenuItem</div>;
}

// =============================================================================
// Invalid Tabs Examples
// =============================================================================

/**
 * ERROR: Tabs.children expects @renders* {Tab}
 * but receives TabPanel (which is NOT a Tab)
 */
export function TabsWithPanel() {
  return (
    <Tabs>
      <Tab label="Valid">Valid tab</Tab>
      {/* TabPanel is NOT a Tab */}
      <TabPanel>This is not a tab!</TabPanel>
    </Tabs>
  );
}

/**
 * ERROR: Tabs.children expects @renders* {Tab}
 * but receives a div
 */
export function TabsWithDiv() {
  return (
    <Tabs>
      <Tab label="Tab 1">Content 1</Tab>
      {/* A div is not a Tab */}
      <div>Random div</div>
    </Tabs>
  );
}

/**
 * ERROR: A component declaring @renders {Tab}
 * but returning TabPanel
 *
 * @renders {Tab}
 */
function WrongTab() {
  // Must return Tab, not TabPanel
  return <TabPanel>Wrong component type</TabPanel>;
}

// =============================================================================
// Invalid Chained Rendering
// =============================================================================

/**
 * ERROR: Declares @renders {CardHeader}
 * but returns a component that @renders {CardFooter}
 *
 * @renders {CardHeader}
 */
function ChainedWrong() {
  // FooterWrapper renders CardFooter, not CardHeader
  return <FooterWrapper />;
}

/**
 * @renders {CardFooter}
 */
function FooterWrapper() {
  return <CardFooter>I render CardFooter</CardFooter>;
}

// =============================================================================
// Multiple Return Paths
// =============================================================================

/**
 * ERROR: One of the return paths returns wrong type
 *
 * @renders {CardHeader}
 */
function ConditionalWrong({ useFooter }: { useFooter: boolean }) {
  if (useFooter) {
    // ERROR: This path returns CardFooter
    return <CardFooter>Wrong!</CardFooter>;
  }
  return <CardHeader>Correct</CardHeader>;
}

// Suppress unused variable warnings for demonstration components
void BrokenHeader;
void BrokenMenuItem;
void DivMenuItem;
void WrongTab;
void ChainedWrong;
void ConditionalWrong;
