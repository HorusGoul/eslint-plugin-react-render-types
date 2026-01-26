/**
 * This file demonstrates VALID usage of render types.
 * All examples here should pass ESLint validation.
 */
import React from "react";
import {
  // Card components
  CardLayout,
  CardHeader,
  CardFooter,
  IconHeader,
  TitleHeader,
  DismissibleHeader,
  // Menu components
  Menu,
  MenuItem,
  IconMenuItem,
  DangerMenuItem,
  CheckboxMenuItem,
  DropdownMenu,
  // Tab components
  Tabs,
  Tab,
  IconTab,
  BadgeTab,
  CloseableTab,
} from "../components";

// =============================================================================
// Valid Card Examples
// =============================================================================

/** Using CardHeader directly */
export function BasicCard() {
  return (
    <CardLayout
      header={<CardHeader>Basic Header</CardHeader>}
      footer={<CardFooter>Footer content</CardFooter>}
    >
      Card body content
    </CardLayout>
  );
}

/** Using IconHeader (which @renders {CardHeader}) */
export function CardWithIconHeader() {
  return (
    <CardLayout header={<IconHeader icon="📦">Package Details</IconHeader>}>
      Package information goes here
    </CardLayout>
  );
}

/** Using TitleHeader (which @renders {CardHeader}) */
export function CardWithTitleHeader() {
  return (
    <CardLayout
      header={<TitleHeader title="User Profile" subtitle="Personal settings" />}
    >
      Profile content
    </CardLayout>
  );
}

/** Using DismissibleHeader (chains: DismissibleHeader -> IconHeader -> CardHeader) */
export function DismissibleCard() {
  return (
    <CardLayout
      header={
        <DismissibleHeader onDismiss={() => console.log("dismissed")}>
          Notification
        </DismissibleHeader>
      }
    >
      This card can be dismissed
    </CardLayout>
  );
}

/** Optional footer can be null */
export function CardWithoutFooter() {
  return (
    <CardLayout header={<CardHeader>Header Only</CardHeader>} footer={null}>
      No footer needed
    </CardLayout>
  );
}

// =============================================================================
// Valid Menu Examples
// =============================================================================

/** Using MenuItem directly */
export function BasicMenu() {
  return (
    <Menu>
      <MenuItem onClick={() => console.log("new")}>New File</MenuItem>
      <MenuItem onClick={() => console.log("open")}>Open...</MenuItem>
      <MenuItem onClick={() => console.log("save")}>Save</MenuItem>
    </Menu>
  );
}

/** Using specialized menu items (all @renders {MenuItem}) */
export function RichMenu() {
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <Menu>
      <IconMenuItem icon="📄" onClick={() => console.log("new")}>
        New Document
      </IconMenuItem>
      <IconMenuItem icon="📁" onClick={() => console.log("open")}>
        Open Folder
      </IconMenuItem>
      <CheckboxMenuItem checked={darkMode} onChange={setDarkMode}>
        Dark Mode
      </CheckboxMenuItem>
      <DangerMenuItem onClick={() => console.log("delete")}>
        Delete All
      </DangerMenuItem>
    </Menu>
  );
}

/** Empty menu is valid (@renders* allows zero items) */
export function EmptyMenu() {
  const items: string[] = [];
  return (
    <Menu>
      {items.map((item) => (
        <MenuItem key={item}>{item}</MenuItem>
      ))}
    </Menu>
  );
}

/** Dropdown with menu items */
export function FileDropdown() {
  return (
    <DropdownMenu trigger="File">
      <MenuItem>New</MenuItem>
      <MenuItem>Open</MenuItem>
      <MenuItem>Save</MenuItem>
    </DropdownMenu>
  );
}

// =============================================================================
// Valid Tabs Examples
// =============================================================================

/** Using Tab directly */
export function BasicTabs() {
  return (
    <Tabs>
      <Tab label="Home">Home content</Tab>
      <Tab label="Profile">Profile content</Tab>
      <Tab label="Settings">Settings content</Tab>
    </Tabs>
  );
}

/** Using specialized tabs (all @renders {Tab}) */
export function RichTabs() {
  return (
    <Tabs>
      <IconTab icon="🏠" label="Home">
        Welcome home!
      </IconTab>
      <BadgeTab label="Messages" count={5}>
        You have unread messages
      </BadgeTab>
      <CloseableTab label="Draft" onClose={() => console.log("closed")}>
        Unsaved draft content
      </CloseableTab>
    </Tabs>
  );
}

/** Mixed tab types */
export function MixedTabs() {
  return (
    <Tabs defaultTab={1}>
      <Tab label="Basic">Basic tab</Tab>
      <IconTab icon="⭐" label="Featured">
        Featured content
      </IconTab>
      <BadgeTab label="Notifications" count={3}>
        Your notifications
      </BadgeTab>
    </Tabs>
  );
}

// =============================================================================
// Custom Components with @renders
// =============================================================================

/**
 * A custom header for user profiles
 * @renders {CardHeader}
 */
function UserProfileHeader({ name, email }: { name: string; email: string }) {
  // Returns CardHeader directly - this validates correctly
  return (
    <CardHeader>
      <h2>{name}</h2>
      <p className="email">{email}</p>
    </CardHeader>
  );
}

/** Using custom component that chains to CardHeader */
export function UserProfileCard() {
  return (
    <CardLayout
      header={<UserProfileHeader name="John Doe" email="john@example.com" />}
    >
      User profile details
    </CardLayout>
  );
}

/**
 * A loading menu item
 * @renders {MenuItem}
 */
function LoadingMenuItem() {
  return <MenuItem disabled>Loading...</MenuItem>;
}

/** Using custom loading menu item */
export function MenuWithLoading() {
  const [isLoading] = React.useState(true);

  return (
    <Menu>
      {isLoading ? (
        <LoadingMenuItem />
      ) : (
        <MenuItem>Loaded content</MenuItem>
      )}
    </Menu>
  );
}

/**
 * A placeholder tab
 * @renders {Tab}
 */
function PlaceholderTab({ label }: { label: string }) {
  return <Tab label={label}>Coming soon...</Tab>;
}

/** Using placeholder tabs */
export function TabsWithPlaceholder() {
  return (
    <Tabs>
      <Tab label="Active">Active content</Tab>
      <PlaceholderTab label="Beta" />
      <PlaceholderTab label="Coming Soon" />
    </Tabs>
  );
}
