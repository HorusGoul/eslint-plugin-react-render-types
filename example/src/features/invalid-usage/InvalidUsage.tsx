/**
 * This file demonstrates INVALID usages that the plugin catches.
 * Running `pnpm lint` will show errors for each violation below.
 *
 * Each section is annotated with the rule that catches the error.
 */

import { NavItem } from "@/design-system/nav/NavItem";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { PageLayout } from "@/design-system/layout/PageLayout";
import { PageHeader } from "@/design-system/layout/PageHeader";
import { PageContent } from "@/design-system/layout/PageContent";
import { Sidebar } from "@/design-system/nav/Sidebar";
import { Flag } from "@/design-system/util/Flag";

// ---------------------------------------------------------------------------
// 1. valid-render-return: Wrong component returned
// ---------------------------------------------------------------------------

/** @renders {NavItem} */
function BrokenNavLink() {
  // ERROR: Returns <div>, not NavItem
  return <div>Not a NavItem</div>;
}

/** @renders {DashboardCard} */
function WrongCard() {
  // ERROR: Returns NavItem, not DashboardCard
  return <NavItem label="Oops" />;
}

/** @renders {DashboardCard} */
function NullCard() {
  // ERROR: Returns null, but annotation is required (not @renders?)
  return null;
}

// ---------------------------------------------------------------------------
// 2. valid-render-prop: Wrong component passed to prop / children
// ---------------------------------------------------------------------------

function BadChildrenUsage() {
  return (
    <>
      {/* ERROR: <div> is not a valid child — expects @renders* {NavItem} */}
      <Sidebar title="Bad">
        <div>Not a NavItem</div>
      </Sidebar>

      {/* ERROR: NavItem is not DashboardCard — expects @renders* {DashboardCard} */}
      <DashboardGrid>
        <NavItem label="Wrong place" />
      </DashboardGrid>

      {/* ERROR: <div> is not PageHeader — expects @renders {PageHeader} on header prop */}
      <PageLayout header={<div>Bad Header</div>}>
        <PageContent>Content</PageContent>
      </PageLayout>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. valid-render-return: Union type error
// ---------------------------------------------------------------------------

/** @renders {StatCard} */
function BadUnionCard() {
  // ERROR: NavItem is not StatCard
  return <NavItem label="Wrong" />;
}

// ---------------------------------------------------------------------------
// 4. valid-render-prop: Wrong component in transparent named prop
// ---------------------------------------------------------------------------

function BadFlagUsage() {
  return (
    <DashboardGrid>
      {/* ERROR: NavItem is not DashboardCard — Flag is transparent, off prop is checked */}
      <Flag name="new-feature" off={<NavItem label="Wrong" />}>
        <StatCard title="OK" value="1" change={0} />
      </Flag>
    </DashboardGrid>
  );
}

// ---------------------------------------------------------------------------
// 5. valid-render-prop: Wrong component via barrel import
// ---------------------------------------------------------------------------

import { Sidebar as BarrelSidebar, NavSection as BarrelNavSection } from "@/design-system/nav";

function BadBarrelUsage() {
  return (
    // ERROR: NavSection is not NavItem — expects @renders* {NavItem} (via barrel)
    <BarrelSidebar title="Bad">
      <BarrelNavSection title="Reports" items={[]} />
    </BarrelSidebar>
  );
}

// ---------------------------------------------------------------------------
// 6. valid-renders-jsdoc: Malformed annotations
// ---------------------------------------------------------------------------

/** @renders DashboardCard */
function MissingBraces() {
  // WARN: Missing braces around component name
  return <DashboardCard title="X">Content</DashboardCard>;
}

/** @renders {dashboardCard} */
function LowercaseName() {
  // WARN: Component name should be PascalCase
  return <DashboardCard title="X">Content</DashboardCard>;
}

/** @renders {} */
function EmptyBraces() {
  // WARN: Empty braces in @renders annotation
  return <DashboardCard title="X">Content</DashboardCard>;
}

// Suppress unused-vars for demonstration components
void BrokenNavLink;
void WrongCard;
void NullCard;
void BadChildrenUsage;
void BadUnionCard;
void BadFlagUsage;
void BadBarrelUsage;
void MissingBraces;
void LowercaseName;
void EmptyBraces;
