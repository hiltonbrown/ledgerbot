export type UserSettings = {
  name: string;
  email: string;
  jobTitle: string;
  language: string;
  timezone: string;
  about: string;
  notifications: {
    productUpdates: boolean;
    securityAlerts: boolean;
    weeklySummary: boolean;
  };
};

const USER_SETTINGS: UserSettings = {
  name: "Alex Rivers",
  email: "alex.rivers@example.com",
  jobTitle: "Operations Lead",
  language: "en",
  timezone: "America/Los_Angeles",
  about:
    "Alex oversees customer accounts and ensures the team has the right visibility into project performance.",
  notifications: {
    productUpdates: true,
    securityAlerts: true,
    weeklySummary: false,
  },
};

export function getUserSettings(): UserSettings {
  return USER_SETTINGS;
}
