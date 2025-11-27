import type { Meta, StoryObj } from "@storybook/react";
import { CustomerDetailsSheet } from "./customer-details-sheet";

const meta = {
  title: "AR/CustomerDetailsSheet",
  component: CustomerDetailsSheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CustomerDetailsSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story: Closed (default state)
export const Closed: Story = {
  args: {
    contactId: null,
    customerName: "",
    totalOutstanding: 0,
    riskScore: 0,
    onOpenChange: () => {},
  },
};

// Story: Open with low risk customer
export const LowRiskCustomer: Story = {
  args: {
    contactId: "customer-low",
    customerName: "Excellent Payer Ltd",
    totalOutstanding: 5000,
    riskScore: 0.15,
    onOpenChange: () => {},
  },
};

// Story: Open with medium risk customer
export const MediumRiskCustomer: Story = {
  args: {
    contactId: "customer-medium",
    customerName: "Occasional Late Corp",
    totalOutstanding: 12_000,
    riskScore: 0.55,
    onOpenChange: () => {},
  },
};

// Story: Open with high risk customer
export const HighRiskCustomer: Story = {
  args: {
    contactId: "customer-high",
    customerName: "Chronic Late Inc",
    totalOutstanding: 25_000,
    riskScore: 0.92,
    onOpenChange: () => {},
  },
};

// Story: Very large outstanding amount
export const LargeOutstanding: Story = {
  args: {
    contactId: "customer-large",
    customerName: "Big Enterprise Pty Ltd",
    totalOutstanding: 150_000,
    riskScore: 0.35,
    onOpenChange: () => {},
  },
};
