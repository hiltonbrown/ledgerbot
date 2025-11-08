# Connecting Your Xero Account to LedgerBot

## Overview

The Xero integration in LedgerBot enables you to access your accounting data directly through conversational AI chat. Once connected, you can ask questions about invoices, customers, financial reports, and more using natural language, without needing to navigate through Xero's interface.

**What you can do with Xero connected:**

- Query invoices, bills, and payments
- Search for customers and suppliers
- View financial reports (Profit & Loss, Balance Sheet, Trial Balance)
- Check bank transactions and reconciliation status
- Access your chart of accounts
- Create and update invoices, contacts, and other records
- Monitor aged receivables and payables

All of this happens securely through AI-powered chat, making your accounting data more accessible and actionable.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Connecting Your Xero Account](#connecting-your-xero-account)
3. [Verifying Your Connection](#verifying-your-connection)
4. [Using Xero Data in Chat](#using-xero-data-in-chat)
5. [Managing Multiple Organisations](#managing-multiple-organisations)
6. [Managing Your Connection](#managing-your-connection)
7. [Troubleshooting](#troubleshooting)
8. [Permissions and Security](#permissions-and-security)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Prerequisites

Before connecting Xero to LedgerBot, ensure you have:

1. **Active Xero Account**: You must have an existing Xero account with at least one organisation
2. **Appropriate Permissions**: You need appropriate permissions within your Xero organisation to authorise third-party applications
   - Standard users can connect their own access
   - If you're using Xero with accounting practice partners, check with your advisor
3. **LedgerBot Account**: You must be logged into your LedgerBot account
4. **Modern Web Browser**: Chrome, Firefox, Safari, or Edge with cookies and JavaScript enabled

> **Note**: LedgerBot requests read and write access to your Xero data. If you only need read access, please contact support for a read-only configuration.

---

## Connecting Your Xero Account

Follow these steps to connect your Xero account to LedgerBot:

### Step 1: Navigate to Integrations

1. Click on **Settings** in the LedgerBot sidebar (gear icon)
2. Select **Integrations** from the settings menu
3. Locate the **Xero** integration card in the **Accounting** section

The Xero card displays:
- Integration name and description
- Current connection status (Available/Connected)
- Connect/Disconnect buttons
- Company selector (if connected)

### Step 2: Initiate the Connection

1. Click the **Connect** button on the Xero integration card
2. LedgerBot will redirect you to Xero's secure login page
3. If you're already logged into Xero, you'll proceed directly to the authorisation screen
4. If not logged in, enter your Xero credentials

> **Security Note**: You're logging in directly with Xero. LedgerBot never sees or stores your Xero username or password.

### Step 3: Authorise LedgerBot

On Xero's authorisation screen, you'll see:

1. **The permissions LedgerBot is requesting**:
   - Access to accounting transactions (invoices, bills, payments)
   - Access to contacts (customers and suppliers)
   - Access to organisation settings and chart of accounts
   - Access to financial reports
   - Access to journal entries
   - Access to attachments
   - Access to payroll data (employees, pay runs, timesheets)

2. **Which organisation(s) to connect**:
   - If you have multiple Xero organisations, select the one(s) you want to connect
   - You can connect to multiple organisations and switch between them later

3. Click **Allow Access** to authorise the connection

### Step 4: Return to LedgerBot

After authorisation:

1. Xero will redirect you back to LedgerBot
2. You'll see a success message confirming the connection
3. The Xero integration card will update to show:
   - Status badge showing "Connected"
   - Organisation name you connected
   - Connection status (green indicator for "Connected")
   - Options to manage or disconnect

**Expected Time**: The entire connection process typically takes 1-2 minutes.

---

## Verifying Your Connection

After connecting, verify your connection is working properly:

### Check Connection Status

1. Navigate to **Settings > Integrations**
2. Locate the Xero integration card
3. Confirm you see:
   - Status badge: "Connected"
   - Organisation name displayed
   - Green status indicator: "Connected"

### Test in Chat

Try asking a simple question in chat to verify data access:

```
What's my organisation name in Xero?
```

or

```
Show me my chart of accounts
```

If the connection is working, LedgerBot will respond with data from your Xero account.

> **Tip**: If you don't receive data, check the [Troubleshooting](#troubleshooting) section below.

---

## Using Xero Data in Chat

Once connected, you can ask LedgerBot questions about your Xero data using natural language. The AI automatically determines which Xero tools to use based on your query.

### Example Queries

#### Invoices and Bills

```
Show me all unpaid invoices from last month
```

```
Get the details for invoice INV-0012
```

```
List all supplier bills from October 2025
```

```
What invoices are overdue?
```

#### Customers and Suppliers

```
List all my customers
```

```
Find the contact details for Acme Corporation
```

```
Show me all customers who have outstanding invoices
```

#### Financial Reports

```
Show me the Profit & Loss report for the last quarter
```

```
Get the Balance Sheet as of today
```

```
What's my Trial Balance for end of financial year?
```

#### Bank Transactions

```
Show me all bank transactions from my main account last week
```

```
List unreconciled bank transactions
```

#### Chart of Accounts

```
Show me all expense accounts
```

```
What's my full chart of accounts?
```

#### Creating and Updating Records

```
Create a draft invoice for Acme Corporation for $1,500 for consulting services
```

```
Add a new customer called "Smith Enterprises" with email contact@smith.com.au
```

```
Update invoice INV-0012 due date to next Friday
```

### Understanding AI Responses

When LedgerBot answers Xero-related questions:

1. **Data is fetched in real-time**: Information comes directly from your Xero account at the moment you ask
2. **Responses are conversational**: Data is formatted in easy-to-read prose, not raw API output
3. **Citations are provided**: LedgerBot indicates when information comes from Xero
4. **Follow-up questions work**: You can ask for more details or clarification in the same conversation

### Best Practices

- **Be specific with date ranges**: When asking about invoices or transactions, specify the date range (e.g., "last month", "October 2025", "Q3 2024")
- **Use invoice/contact names or IDs**: For detailed queries, use the exact invoice number or contact name
- **Start broad, then narrow**: Begin with general queries like "show me unpaid invoices", then ask for specific details
- **Ask for summaries**: Request totals, counts, or summaries rather than raw lists when possible

---

## Managing Multiple Organisations

If you have multiple Xero organisations, you can connect and switch between them in LedgerBot.

### Connecting Additional Organisations

1. Navigate to **Settings > Integrations**
2. Find the **Company** dropdown on the Xero integration card
3. Select **Add new...** from the dropdown
4. Follow the connection steps to authorise the new organisation
5. Both organisations will now appear in the dropdown

### Switching Between Organisations

To change which organisation's data appears in chat:

1. Navigate to **Settings > Integrations**
2. Use the **Company** dropdown to select the organisation you want to use
3. The selected organisation will have "(Active)" indicated next to its name
4. All subsequent chat queries will use data from the active organisation

### Viewing All Organisations

To see a comprehensive list of all connected organisations:

1. Navigate to **Settings > Integrations**
2. Click **View all organisations** link below the Company dropdown
3. You'll see a list of all organisations with connection details

> **Note**: Only one organisation can be active at a time. Chat queries will always use the currently active organisation.

---

## Managing Your Connection

### Checking Connection Health

LedgerBot displays connection status on the Xero integration card:

- **Green indicator "Connected"**: Connection is healthy and active
- **Red indicator "Connection Error"**: Connection has failed and needs attention

If you see a connection error:

1. An error message will display with details
2. Click **Reconnect to Xero** to re-authorise
3. Follow the authorisation flow again

### Automatic Token Refresh

LedgerBot automatically manages your Xero connection security:

- **Access tokens expire every 30 minutes**: These are refreshed automatically in the background
- **Refresh tokens last 60 days**: LedgerBot uses these to get new access tokens
- **You don't need to do anything**: Token management is fully automated

> **Important**: If you don't use your Xero connection for 60 days, the refresh token expires and you'll need to reconnect manually.

### Disconnecting Your Xero Account

To disconnect Xero from LedgerBot:

1. Navigate to **Settings > Integrations**
2. Locate the Xero integration card
3. Click the **Disconnect** button
4. Confirm the disconnection when prompted

**What happens when you disconnect:**

- LedgerBot revokes its access to your Xero data
- All stored connection tokens are deleted from LedgerBot's database
- Your Xero data remains unchanged in Xero
- You can reconnect at any time by following the connection steps again

**The connection will also be deactivated automatically if:**

- Token refresh fails repeatedly
- The refresh token expires (after 60 days of inactivity)
- You revoke access from within Xero's settings

---

## Troubleshooting

### Connection Failed During Setup

**Symptoms**: After clicking "Allow Access" in Xero, you're redirected to LedgerBot with an error message.

**Solutions**:

1. **Check your browser**: Ensure cookies and JavaScript are enabled
2. **Try again**: Click **Connect** again on the integration card
3. **Clear browser cache**: Clear your browser cache and cookies, then retry
4. **Check Xero status**: Visit [Xero Status](https://status.xero.com/) to verify Xero's services are operational
5. **Contact support**: If the issue persists, contact LedgerBot support with the error message

### "Connection Error" Status

**Symptoms**: The Xero integration card shows a red "Connection Error" indicator.

**Solutions**:

1. **Read the error message**: The card displays details about the error
2. **Click Reconnect**: Click **Reconnect to Xero** to re-authorise your connection
3. **Check token expiry**: If it's been more than 60 days since you last used Xero in LedgerBot, you'll need to reconnect

### No Data Returned in Chat

**Symptoms**: When you ask Xero-related questions, LedgerBot doesn't return any data or says it can't access Xero.

**Solutions**:

1. **Verify connection status**: Go to Settings > Integrations and check the Xero connection shows "Connected"
2. **Try a simple query**: Ask "What's my organisation name in Xero?" to test basic access
3. **Check your Xero permissions**: Log into Xero directly and verify you have access to the data you're requesting
4. **Reconnect**: If other solutions don't work, disconnect and reconnect your Xero account

### Slow Responses

**Symptoms**: Xero queries take a long time to respond in chat.

**Solutions**:

1. **Be patient**: Xero API calls can take several seconds, especially for large datasets
2. **Narrow your query**: Instead of "show all invoices", try "show invoices from last month"
3. **Use filters**: Apply status, date, or contact filters to reduce the amount of data retrieved
4. **Check Xero status**: Slow responses might indicate Xero's API is experiencing delays

### "Reconnect Required" Messages

**Symptoms**: LedgerBot prompts you to reconnect your Xero account when trying to access data.

**Causes**:

- Refresh token has expired (60 days of inactivity)
- You revoked access from within Xero
- Multiple failed token refresh attempts
- Connection was manually disconnected

**Solution**: Navigate to Settings > Integrations and click **Connect** to re-authorise.

---

## Permissions and Security

### What Permissions Does LedgerBot Request?

LedgerBot requests the following permissions (scopes) from Xero:

| Permission | Purpose |
|------------|---------|
| **Offline Access** | Allows LedgerBot to refresh access tokens automatically without requiring you to log in repeatedly |
| **Accounting Transactions** | Access to invoices, bills, payments, and credit notes |
| **Contacts** | Access to customers and suppliers |
| **Organisation Settings** | Access to organisation details and chart of accounts |
| **Financial Reports** | Access to Profit & Loss, Balance Sheet, and other reports |
| **Journal Entries** | Access to manual journal entries |
| **Attachments** | Access to files attached to transactions |
| **Payroll (Employees, Pay Runs, Timesheets)** | Access to payroll data for comprehensive accounting insights |

> **Note**: LedgerBot requests full read and write access to enable creating and updating records via chat. If you only need read access, contact support for a custom integration.

### How Are Tokens Stored?

LedgerBot takes security seriously:

1. **Encrypted at Rest**: All OAuth tokens (access and refresh tokens) are encrypted using AES-256-GCM encryption before being stored in the database
2. **Encrypted in Transit**: All communication between LedgerBot and Xero uses HTTPS/TLS encryption
3. **Automatic Expiry**: Access tokens expire after 30 minutes and are automatically refreshed
4. **Secure Environment**: Encryption keys are stored in secure environment variables, never in code or configuration files

### Data Privacy

- **No data duplication**: LedgerBot does not copy or store your Xero financial data. All data is fetched in real-time when you ask questions
- **No data sharing**: Your Xero data is never shared with third parties
- **You remain in control**: You can disconnect your Xero account at any time, and LedgerBot will immediately lose access
- **Audit trail**: All actions are logged for security and debugging purposes

### Revoking Access

You can revoke LedgerBot's access to Xero in two ways:

**Option 1: From LedgerBot**

1. Navigate to Settings > Integrations
2. Click **Disconnect** on the Xero integration card

**Option 2: From Xero**

1. Log into Xero
2. Navigate to Settings > Connected apps
3. Find LedgerBot in the list
4. Click **Disconnect**

Either method immediately revokes access. LedgerBot will detect the revocation and deactivate the connection.

### OAuth 2.0 Authorization Code Flow

LedgerBot uses the **OAuth 2.0 Authorization Code Flow** (with client secret) for secure authentication:

- **Industry standard**: This is the recommended authentication method for server-side applications
- **User consent**: You explicitly authorise LedgerBot during the connection process
- **Xero controls access**: Xero issues tokens and can revoke them at any time
- **Secure implementation**: Client secrets are stored securely on the server, never exposed to the browser

For more technical details, see the [Xero Authentication Guide](/docs/xero-authentication-guide.md).

---

## Frequently Asked Questions

### Do I need to reconnect every time I use LedgerBot?

No. Once connected, LedgerBot automatically manages your Xero session for 60 days. You only need to reconnect if:

- You manually disconnect
- 60 days pass without using the Xero integration
- Token refresh fails multiple times
- You revoke access from within Xero

### Can I connect multiple Xero organisations?

Yes. You can connect multiple Xero organisations (e.g., if you manage multiple businesses or work with multiple practices). Use the **Company** dropdown in Settings > Integrations to switch between them. Only one organisation can be active at a time for chat queries.

### Will LedgerBot change my data in Xero?

LedgerBot can create and update records if you explicitly ask it to (e.g., "create an invoice", "update a contact"). However:

- The AI will usually confirm details before making changes
- You can review draft records before finalising them
- You remain in full control of your Xero data
- If you only want read access, contact support for a read-only integration

### What happens if my Xero subscription expires?

If your Xero subscription expires or is suspended:

- LedgerBot will be unable to access your Xero data
- You'll see error messages when trying to query Xero data
- Once you reactivate your Xero subscription, the connection should resume automatically
- If issues persist, try disconnecting and reconnecting in LedgerBot

### Can I use LedgerBot with Xero Practice Manager?

Currently, LedgerBot is designed for Xero Accounting organisations. Support for Xero Practice Manager is planned for a future release. Contact support if you need this functionality.

### How much does the Xero integration cost?

The Xero integration is included in your LedgerBot subscription at no additional cost. You'll still need an active Xero subscription to use the integration.

### Is my data safe?

Yes. LedgerBot uses industry-standard security practices:

- All tokens are encrypted using AES-256-GCM
- All communication uses TLS/HTTPS encryption
- No financial data is stored (only fetched in real-time)
- You can revoke access at any time
- LedgerBot is compliant with Australian privacy regulations

### Can I use LedgerBot on mobile?

Yes. LedgerBot and the Xero integration work on mobile devices through your mobile web browser. The connection and chat experience are fully responsive and mobile-friendly.

### What if I get an error asking me to reconnect?

This usually means:

1. Your refresh token has expired (after 60 days of inactivity)
2. Token refresh failed multiple times
3. You revoked access from Xero's settings

**Solution**: Navigate to Settings > Integrations and click **Connect** to re-authorise your connection. This process takes less than a minute.

### Can I see what data LedgerBot accessed?

Currently, LedgerBot logs all Xero API calls for debugging and security purposes, but these logs are internal. We're planning to add a user-facing activity log in a future release. Contact support if you need details about recent API access.

---

## Next Steps

Now that your Xero account is connected:

1. **Explore the chat**: Try asking questions about your invoices, customers, and reports
2. **Set up other integrations**: Consider connecting payroll systems like Employment Hero or Deputy from Settings > Integrations
3. **Customise your experience**: Visit Settings > Personalisation to configure your default AI model and system prompts
4. **Use agent workspaces**: Explore specialised AI agents for document management, reconciliations, compliance, and more at the Agents page

---

## Support

If you encounter issues not covered in this guide:

- **Email support**: support@ledgerbot.com.au
- **In-app help**: Click the Help icon in the LedgerBot sidebar
- **Documentation**: Visit `/docs` for technical documentation and guides

When contacting support, please include:

- The error message you're seeing (if any)
- Steps you took before encountering the issue
- Your Xero organisation name (if comfortable sharing)
- Screenshots of the issue (if applicable)

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Applies to**: LedgerBot Web Application with Xero Integration v1.0
