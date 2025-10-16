[![](https://i.imgur.com/kzfh8mf.png)](https://developer.xero.com/documentation/)

-SDK-JavaNodeC#PHPPythonRuby-API-AccountingAssetsFilesProjectsPayroll (AU)Payroll (UK)Payroll (NZ)BankfeedsApp StoreFinance

# Xero Accounting API

# Accounting

# createAccount

Creates a new chart of accounts

```
/Accounts
```

### Usage and SDK Samples

- [Node](https://xeroapi.github.io/xero-node/accounting/index.html#examples-Accounting-createAccount-0-javascript)

```javascript
await xero.setTokenSet(tokenSet);

const xeroTenantId = 'YOUR_XERO_TENANT_ID';
const idempotencyKey = 'KEY_VALUE';

const account: Account = {
  code: "123456",
  name: "FooBar",
  type: AccountType.EXPENSE,
  description: "Hello World"
};

try {
  const response = await xero.accountingApi.createAccount(xeroTenantId, account, idempotencyKey);
  console.log(response.body || response.response.statusCode)
} catch (err) {
  const error = JSON.stringify(err.response.body, null, 2)
  console.log(`Status Code: ${err.response.statusCode} => ${error}`);
}
```

## Scopes

|     |     |
| --- | --- |
| accounting.settings | Grant read-write access to organisation and account settings |

## Parameters

Header parameters

| Name | Description |
| --- | --- |
| xero-tenant-id\* | String<br> <br>Xero identifier for Tenant<br>Required |
| Idempotency-Key | String<br> <br>This allows you to safely retry requests without the risk of duplicate processing. 128 character max. |

Body parameters

| Name | Description |
| --- | --- |
| account \* | Account<br> <br>Account object in body of request<br>Required |

* * *

# createAccountAttachmentByFileName

Creates an attachment on a specific account

```
/Accounts/{AccountID}/Attachments/{FileName}
```

### Usage and SDK Samples

- [Node](https://xeroapi.github.io/xero-node/accounting/index.html#examples-Accounting-createAccountAttachmentByFileName-0-javascript)

```javascript
await xero.setTokenSet(tokenSet);

const xeroTenantId = 'YOUR_XERO_TENANT_ID';
const accountID = '00000000-0000-0000-0000-000000000000';
const fileName = 'xero-dev.jpg';
const idempotencyKey = 'KEY_VALUE';
const path = require("path");
const mime = require("mime-types");
const pathToUpload = path.resolve(__dirname, "../public/images/xero-dev.jpg"); // determine the path to your file
const body = fs.createReadStream(pathToUpload); // {fs.ReadStream} read the file
const contentType = mime.lookup(fileName);

try {
  const response = await xero.accountingApi.createAccountAttachmentByFileName(xeroTenantId, accountID, fileName, body, idempotencyKey, {
    headers: {
      "Content-Type": contentType,
    }
  });
  console.log(response.body || response.response.statusCode)
} catch (err) {
  const error = JSON.stringify(err.response.body, null, 2)
  console.log(`Status Code: ${err.response.statusCode} => ${error}`);
}
```

## Scopes

|     |     |
| --- | --- |
| accounting.attachments | Grant read-write access to attachments |

## Parameters

Path parameters

| Name | Description |
| --- | --- |
| AccountID\* | UUID<br> <br>(uuid)<br> <br>Unique identifier for Account object<br>Required |
| FileName\* | String<br> <br>Name of the attachment<br>Required |

Header parameters

| Name | Description |
| --- | --- |
| xero-tenant-id\* | String<br> <br>Xero identifier for Tenant<br>Required |
| Idempotency-Key | String<br> <br>This allows you to safely retry requests without the risk of duplicate processing. 128 character max. |

Body parameters

| Name | Description |
| --- | --- |
| body \* | byte\[\]<br> <br>Byte array of file in body of request<br>Required |

* * *

```