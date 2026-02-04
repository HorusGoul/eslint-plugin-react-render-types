import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  BarChart3,
  FileText,
} from "lucide-react";
import { NavLink, NavItems, NavSection } from "@/design-system/nav";
import { PageLayout } from "@/design-system/layout/PageLayout";
import { PageHeader } from "@/design-system/layout/PageHeader";
import { PageContent } from "@/design-system/layout/PageContent";
import { DataTable } from "@/design-system/data/DataTable";
import { TextColumn } from "@/design-system/data/TextColumn";
import { BadgeColumn } from "@/design-system/data/BadgeColumn";
import { ActionColumn } from "@/design-system/data/ActionColumn";
import { StatusColumn } from "@/design-system/data/StatusColumn";
import { FormSection } from "@/design-system/forms/FormSection";
import { TextField } from "@/design-system/forms/TextField";
import { SelectField } from "@/design-system/forms/SelectField";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ConditionalCard } from "@/components/dashboard/ConditionalCard";
import { MultiCard } from "@/components/dashboard/MultiCard";
import { DynamicCard } from "@/components/dashboard/DynamicCard";
import { FlexSlot } from "@/components/dashboard/FlexSlot";
import { AppNavLink } from "@/components/navigation/AppNavLink";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/design-system/ui/button";
import { Flag } from "@/design-system/util/Flag";
import { Suspense } from "react";

const sampleData = [{ id: 1 }, { id: 2 }, { id: 3 }];

export function DashboardPage() {
  return (
    <DashboardLayout
      title="Acme Dashboard"
      navigation={
        <>
          {/* NavItems imported via barrel — renders NavItem, valid in NavItem | NavSection */}
          <NavItems
            links={[
              { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", href: "/", active: true },
              { icon: <Users className="h-4 w-4" />, label: "Customers", href: "/customers" },
              { icon: <ShoppingCart className="h-4 w-4" />, label: "Orders", href: "/orders" },
            ]}
          />
          <NavSection
            title="Reports"
            items={[
              { icon: <BarChart3 className="h-4 w-4" />, label: "Analytics", href: "/analytics" },
              { icon: <FileText className="h-4 w-4" />, label: "Invoices", href: "/invoices" },
            ]}
          />

          <AppNavLink label="Documentation" href="https://github.com" />

          <NavLink
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            href="/settings"
          />
        </>
      }
    >
      <PageLayout
        header={
          <PageHeader
            title="Dashboard"
            description="Overview of your business metrics"
            actions={<Button>Export</Button>}
          />
        }
      >
        <PageContent>
          <DashboardGrid
            highlight={
              <FlexSlot
                variant="stat"
                title="Highlighted Metric"
                statValue="$128,430"
                statChange={14.2}
                description="Featured KPI"
              />
            }
          >
            <StatCard title="Revenue" value="$45,231" change={12.5} />
            <StatCard title="Customers" value="2,350" change={-3.1} />
            {/* Suspense is transparent via settings — plugin sees through to ChartCard */}
            <Suspense fallback={null}>
              <ChartCard
                title="Weekly Sales"
                data={[40, 55, 30, 65, 80, 60, 75]}
                description="Last 7 days"
              />
            </Suspense>
            {/* Flag is transparent via @transparent {off, children} — plugin checks both props */}
            <Flag
              name="new-orders-card"
              off={<StatCard title="Orders (legacy)" value="573" change={8.2} />}
            >
              <StatCard title="Active Orders" value="573" change={8.2} />
            </Flag>
          </DashboardGrid>

          <ConditionalCard
            show={true}
            title="Bonus Metric"
            value="98.5%"
            change={0.3}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <MultiCard
              items={[
                { title: "Conversion Rate", value: "3.2%", change: 0.8 },
                { title: "Avg Order Value", value: "$67.50", change: -2.1 },
                { title: "Return Rate", value: "4.1%", change: -1.5 },
              ]}
            />
          </div>

          <DynamicCard type="chart" title="Dynamic Chart" />

          <DataTable
            columns={["Name", "Status", "Role", "Actions"]}
            data={sampleData}
          >
            <TextColumn header="Name" value="John Doe" />
            <StatusColumn
              header="Status"
              value="Active"
              showBadge={true}
              variant="default"
            />
            <BadgeColumn header="Role" value="Admin" variant="secondary" />
            <ActionColumn header="Actions" />
          </DataTable>

          <FormSection title="Quick Settings">
            <TextField label="Company Name" placeholder="Acme Inc." />
            <SelectField
              label="Time Zone"
              placeholder="Select a timezone"
              options={[
                { label: "UTC", value: "utc" },
                { label: "EST", value: "est" },
                { label: "PST", value: "pst" },
              ]}
            />
          </FormSection>
        </PageContent>
      </PageLayout>
    </DashboardLayout>
  );
}
