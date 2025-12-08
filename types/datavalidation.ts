export type XeroContactRecord = {
  contactId: string;
  name: string;
  taxNumber?: string; // ABN
  companyNumber?: string; // ACN
  isCustomer: boolean;
  isSupplier: boolean;
  emailAddress?: string;
  phone?: string;
  addresses?: Array<{
    addressType: string;
    addressLine1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
};

export type ASICCompanyRecord = {
  companyName: string;
  acn: string;
  abn?: string;
  type: string;
  class: string;
  subClass?: string;
  status: "Registered" | "Deregistered";
  registrationDate: Date;
  deregistrationDate?: Date;
};

export type ASICBusinessNameRecord = {
  businessName: string;
  abn: string;
  status: "Active" | "Cancelled";
  registrationDate: Date;
  cancellationDate?: Date;
};

export type ABRRecord = {
  abn: string;
  abnStatus: "Active" | "Cancelled";
  entityName: string;
  entityType: string;
  gstRegistered: boolean;
  gstRegistrationDate?: Date;
  businessNames: string[];
};

export type VerificationResult = {
  xeroContact: XeroContactRecord;
  asicCompanyMatch?: ASICCompanyRecord;
  asicBusinessNameMatch?: ASICBusinessNameRecord;
  abrRecord?: ABRRecord;
  verificationStatus: "verified" | "warnings" | "errors" | "pending";
  issues: VerificationIssue[];
  verifiedAt: Date;
};

export type VerificationIssue = {
  type: "error" | "warning" | "info";
  code: string; // e.g., 'INVALID_ABN', 'NOT_GST_REGISTERED', 'COMPANY_DEREGISTERED'
  message: string;
  field?: string;
};

export type VerificationSummary = {
  totalContacts: number;
  customers: number;
  suppliers: number;
  verified: number;
  warnings: number;
  errors: number;
  pending: number;
  lastSyncDate?: Date;
  lastVerificationDate?: Date;
};

export type DataValidationSettings = {
  autoVerifyOnSync: boolean;
  gstWarningEnabled: boolean;
  nameMatchThreshold: number; // 0-1 similarity score
  webhookEnabled: boolean;
};
