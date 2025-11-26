import type { Meta, StoryObj } from "@storybook/react";
import { StaleDataBanner } from "./stale-data-banner";

const meta = {
  title: "AR/StaleDataBanner",
  component: StaleDataBanner,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StaleDataBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story: No sync (null date)
export const NoSync: Story = {
  args: {
    lastSyncDate: null,
    syncStatus: null,
  },
};

// Story: Failed sync
export const FailedSync: Story = {
  args: {
    lastSyncDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    syncStatus: "failed",
  },
};

// Story: Stale data (> 24 hours)
export const StaleData: Story = {
  args: {
    lastSyncDate: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    syncStatus: "success",
  },
};

// Story: Fresh data (< 24 hours) - No banner shown
export const FreshData: Story = {
  args: {
    lastSyncDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    syncStatus: "success",
  },
};

// Story: Very stale data
export const VeryStale: Story = {
  args: {
    lastSyncDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    syncStatus: "success",
  },
};
