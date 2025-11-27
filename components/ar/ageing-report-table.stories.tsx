import type { Meta, StoryObj } from "@storybook/react";
import { AgeingReportTable } from "./ageing-report-table";

const meta = {
  title: "AR/AgeingReportTable",
  component: AgeingReportTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AgeingReportTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data generator
const generateMockCustomer = (index: number) => ({
  contactId: `customer-${index}`,
  customerName: `Customer ${index}`,
  totalOutstanding: Math.random() * 10_000,
  ageingCurrent: Math.random() * 2000,
  ageing1_30: Math.random() * 2000,
  ageing31_60: Math.random() * 2000,
  ageing61_90: Math.random() * 2000,
  ageing90Plus: Math.random() * 2000,
  riskScore: Math.random(),
  lastUpdated: new Date(),
});

// Story: Empty state
export const Empty: Story = {
  args: {
    initialData: [],
  },
};

// Story: Few customers
export const FewCustomers: Story = {
  args: {
    initialData: Array.from({ length: 5 }, (_, i) => generateMockCustomer(i)),
  },
};

// Story: Many customers (pagination test)
export const ManyCustomers: Story = {
  args: {
    initialData: Array.from({ length: 100 }, (_, i) => generateMockCustomer(i)),
  },
};

// Story: High risk customers
export const HighRiskCustomers: Story = {
  args: {
    initialData: [
      {
        contactId: "1",
        customerName: "Risky Customer A",
        totalOutstanding: 15_000,
        ageingCurrent: 0,
        ageing1_30: 0,
        ageing31_60: 0,
        ageing61_90: 0,
        ageing90Plus: 15_000,
        riskScore: 0.95,
        lastUpdated: new Date(),
      },
      {
        contactId: "2",
        customerName: "Risky Customer B",
        totalOutstanding: 12_000,
        ageingCurrent: 0,
        ageing1_30: 0,
        ageing31_60: 5000,
        ageing61_90: 7000,
        ageing90Plus: 0,
        riskScore: 0.78,
        lastUpdated: new Date(),
      },
      {
        contactId: "3",
        customerName: "Safe Customer C",
        totalOutstanding: 3000,
        ageingCurrent: 3000,
        ageing1_30: 0,
        ageing31_60: 0,
        ageing61_90: 0,
        ageing90Plus: 0,
        riskScore: 0.15,
        lastUpdated: new Date(),
      },
    ],
  },
};

// Story: Mix of risk levels
export const MixedRiskLevels: Story = {
  args: {
    initialData: [
      // Low risk
      {
        contactId: "low-1",
        customerName: "Excellent Payer Ltd",
        totalOutstanding: 5000,
        ageingCurrent: 4500,
        ageing1_30: 500,
        ageing31_60: 0,
        ageing61_90: 0,
        ageing90Plus: 0,
        riskScore: 0.1,
        lastUpdated: new Date(),
      },
      // Medium risk
      {
        contactId: "med-1",
        customerName: "Occasional Late Corp",
        totalOutstanding: 8000,
        ageingCurrent: 3000,
        ageing1_30: 2000,
        ageing31_60: 2000,
        ageing61_90: 1000,
        ageing90Plus: 0,
        riskScore: 0.45,
        lastUpdated: new Date(),
      },
      // High risk
      {
        contactId: "high-1",
        customerName: "Chronic Late Inc",
        totalOutstanding: 25_000,
        ageingCurrent: 0,
        ageing1_30: 0,
        ageing31_60: 0,
        ageing61_90: 5000,
        ageing90Plus: 20_000,
        riskScore: 0.92,
        lastUpdated: new Date(),
      },
    ],
  },
};
