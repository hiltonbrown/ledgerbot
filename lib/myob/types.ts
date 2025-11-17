import type { MyobConnection } from "@/lib/db/schema";

export type { MyobConnection };

export interface MyobTokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  user?: {
    uid: string;
    username: string;
  };
}

export interface MyobTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  user?: {
    uid: string;
    username: string;
  };
}

export interface MyobCompanyFile {
  Id: string;
  Name: string;
  LibraryPath: string;
  ProductVersion: string;
  ProductLevel: {
    Code: string;
    Name: string;
  };
  Uri: string;
}

export interface DecryptedMyobConnection
  extends Omit<
    MyobConnection,
    "accessToken" | "refreshToken" | "cfUsername" | "cfPassword"
  > {
  accessToken: string;
  refreshToken: string;
  cfUsername: string | null;
  cfPassword: string | null;
}

export interface MyobOAuthCallbackParams {
  code: string;
  state: string;
  businessId: string; // MYOB's cf_uri parameter (added with prompt=consent)
}

export interface MyobConnectionInfo {
  businessId: string;
  businessName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

// MYOB API response types
export interface MyobApiResponse<T> {
  Items?: T[];
  Count?: number;
  NextPageLink?: string;
}

export interface MyobContact {
  UID: string;
  DisplayID: string;
  CompanyName?: string;
  FirstName?: string;
  LastName?: string;
  IsIndividual: boolean;
  IsActive: boolean;
  Addresses?: MyobAddress[];
  PhoneNumbers?: MyobPhone[];
  Email?: string;
  ABN?: string;
  SellingDetails?: {
    SaleLayout?: string;
    InvoiceDelivery?: string;
    ItemPriceLevel?: string;
    TaxCode?: {
      UID: string;
      Code: string;
      URI: string;
    };
    FreightTaxCode?: {
      UID: string;
      Code: string;
      URI: string;
    };
  };
  BuyingDetails?: {
    PurchaseLayout?: string;
    TaxCode?: {
      UID: string;
      Code: string;
      URI: string;
    };
    FreightTaxCode?: {
      UID: string;
      Code: string;
      URI: string;
    };
  };
  URI: string;
  RowVersion: string;
}

export interface MyobAddress {
  Location: number;
  Street: string;
  City: string;
  State: string;
  PostCode: string;
  Country: string;
  Phone1?: string;
  Phone2?: string;
  Fax?: string;
  Email?: string;
  Website?: string;
  ContactName?: string;
  Salutation?: string;
}

export interface MyobPhone {
  Location: number;
  Phone1: string;
  Phone2?: string;
  Fax?: string;
}

export interface MyobInvoice {
  UID: string;
  Number: string;
  Date: string;
  CustomerPurchaseOrderNumber?: string;
  Customer: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  ShipToAddress?: string;
  Terms?: {
    PaymentIsDue: string;
    DiscountDate?: number;
    BalanceDueDate: number;
    DiscountForEarlyPayment?: number;
    MonthlyChargeForLatePayment?: number;
  };
  IsTaxInclusive: boolean;
  Lines: MyobInvoiceLine[];
  Subtotal: number;
  TotalTax: number;
  TotalAmount: number;
  Category?: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  Comment?: string;
  ShippingMethod?: string;
  JournalMemo?: string;
  ReferralSource?: string;
  InvoiceDeliveryStatus?: string;
  AppliedToDate?: number;
  BalanceDueAmount?: number;
  Status?: string;
  LastPaymentDate?: string;
  URI: string;
  RowVersion: string;
}

export interface MyobInvoiceLine {
  RowID: number;
  Type: "Transaction" | "Header" | "Subtotal";
  Description: string;
  Account?: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  TaxCode?: {
    UID: string;
    Code: string;
    URI: string;
  };
  Total: number;
  UnitCount?: number;
  UnitPrice?: number;
  DiscountPercent?: number;
  Job?: {
    UID: string;
    Number: string;
    Name: string;
    URI: string;
  };
}

export interface MyobAccount {
  UID: string;
  DisplayID: string;
  Name: string;
  Type: string;
  Classification: string;
  IsActive: boolean;
  Level: number;
  IsHeader: boolean;
  OpeningBalance?: number;
  CurrentBalance?: number;
  Description?: string;
  TaxCode?: {
    UID: string;
    Code: string;
    URI: string;
  };
  BankingDetails?: {
    BSBNumber?: string;
    BankAccountNumber?: string;
    BankAccountName?: string;
    CreateBankFiles?: boolean;
    DirectEntryUserId?: string;
  };
  URI: string;
  RowVersion: string;
}

export interface MyobJournalEntry {
  UID: string;
  DisplayID: string;
  DateOccurred: string;
  Memo: string;
  IsTaxInclusive: boolean;
  Lines: MyobJournalLine[];
  Category?: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  SourceTransaction?: string;
  URI: string;
  RowVersion: string;
}

export interface MyobJournalLine {
  RowID: number;
  Account: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  TaxCode?: {
    UID: string;
    Code: string;
    URI: string;
  };
  Amount: number;
  IsCredit: boolean;
  Memo?: string;
  Job?: {
    UID: string;
    Number: string;
    Name: string;
    URI: string;
  };
}

export interface MyobTaxCode {
  UID: string;
  Code: string;
  Description: string;
  Type: string;
  Rate: number;
  IsActive: boolean;
  URI: string;
  RowVersion: string;
}

export interface MyobBankTransaction {
  UID: string;
  Type: "Spend Money" | "Receive Money";
  Date: string;
  Account: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  Payee?: string;
  Lines: MyobBankTransactionLine[];
  Memo?: string;
  Amount: number;
  Category?: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  URI: string;
  RowVersion: string;
}

export interface MyobBankTransactionLine {
  RowID: number;
  Account: {
    UID: string;
    Name: string;
    DisplayID: string;
    URI: string;
  };
  TaxCode?: {
    UID: string;
    Code: string;
    URI: string;
  };
  Amount: number;
  Memo?: string;
  IsCredit: boolean;
  Job?: {
    UID: string;
    Number: string;
    Name: string;
    URI: string;
  };
}
