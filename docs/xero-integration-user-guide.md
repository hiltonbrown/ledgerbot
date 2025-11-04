# Xero Integration User Guide

## Overview

The Xero Integration connects LedgerBot directly to your Xero accounting software, allowing you to query and manage your financial data using natural conversation. Instead of logging into Xero and navigating through menus, you can simply ask LedgerBot questions like "Show me all unpaid invoices from last month" or "What's my current cash position?"

### What You Can Do with the Xero Integration

- **View Financial Data**: Access invoices, bills, contacts, bank transactions, and financial reports through simple chat queries
- **Create and Update Records**: Draft invoices, add new customers or suppliers, record payments, and create quotes
- **Generate Reports**: Pull profit and loss statements, balance sheets, trial balances, and aged receivables/payables reports
- **Manage Contacts**: Search for customers and suppliers, view contact details, and update information
- **Track Inventory**: Check item codes, pricing, and stock information
- **Monitor Cash Flow**: Review bank transactions, payments, and outstanding balances

### Benefits for Your Workflow

- **Save Time**: Get answers without navigating multiple Xero screens
- **Natural Language**: Ask questions in plain English instead of learning complex menu structures
- **Quick Insights**: Combine multiple data points in a single conversation (e.g., "Show me unpaid invoices for Acme Corp and their contact details")
- **Secure Access**: Your Xero data remains private and is accessed through official Xero authentication
- **Real-Time Data**: All information is pulled directly from your live Xero organisation

---

## Getting Started

### How to Connect Your Xero Account

1. **Navigate to Settings**
   - Click on your profile icon in the top right corner
   - Select "Settings" from the dropdown menu
   - Click on "Integrations" in the left sidebar

2. **Find the Xero Integration Card**
   - Look for the "Xero" card in the "Accounting" section
   - The card shows "available" if you haven't connected yet

3. **Click "Connect"**
   - Click the blue "Connect" button on the Xero card
   - You'll be redirected to Xero's secure login page

4. **Log In to Xero**
   - Enter your Xero email and password
   - If you use two-factor authentication, complete that step as well

5. **Authorise LedgerBot**
   - Xero will show you what permissions LedgerBot is requesting
   - Review the permissions (detailed below)
   - Click "Allow access" to authorise the connection

6. **Select Your Organisation** (if you have multiple)
   - If you manage multiple Xero organisations, LedgerBot will connect to all of them
   - You can switch between organisations later in your Settings

7. **Confirmation**
   - You'll be redirected back to LedgerBot
   - A green success message will confirm the connection
   - The Xero card will now show "connected" with your organisation name

### What Permissions Are Requested

When you connect Xero, LedgerBot requests access to the following:

- **Accounting transactions**: Read and create invoices, bills, credit notes, and payments
- **Contacts**: View and manage customers and suppliers
- **Settings**: Access your chart of accounts and organisation details
- **Reports**: Generate financial reports (profit and loss, balance sheet, etc.)
- **Journal entries**: View manual journals and adjustments
- **Attachments**: Access files attached to transactions (future feature)
- **Payroll data**: View employee records, pay runs, and timesheets (if applicable)

**Why These Permissions?** LedgerBot needs comprehensive access to help you with accounting queries. For example, to answer "Show me invoices for Acme Corp", LedgerBot needs access to both invoices and contacts. All access is read-only unless you specifically ask to create or update records.

### Verifying Your Connection

After connecting, check that everything is working:

1. **Check the Settings Page**
   - Go to Settings > Integrations
   - The Xero card should display:
     - "connected" status badge
     - Your organisation name
     - Token expiry date (typically 30 days from now)

2. **Test in Chat**
   - Open a new chat or continue an existing conversation
   - Ask a simple question like: "What's my Xero organisation name?"
   - LedgerBot should respond with your organisation details from Xero

If the connection isn't working, see the Troubleshooting section below.

---

## Using Xero in Chat

### How It Works

Once connected, LedgerBot automatically detects when your questions relate to Xero data and uses the appropriate tools to fetch information. You don't need to specify that you want to use Xero; just ask your question naturally.

### Example Queries You Can Ask

**Invoices and Bills**
- "Show me all unpaid invoices from last month"
- "What invoices did we send to Acme Corporation?"
- "Get the details for invoice INV-001"
- "List all draft invoices"
- "Show me invoices due this week"

**Customers and Suppliers**
- "Find all customers with 'Smith' in their name"
- "Show me contact details for john@example.com"
- "List all my active suppliers"
- "What's the phone number for Acme Corp?"

**Financial Reports**
- "Generate a profit and loss report for the last quarter"
- "Show me the balance sheet as of 30 June"
- "What's my trial balance for today?"
- "Show me aged receivables for Acme Corporation"

**Bank Transactions and Payments**
- "List bank transactions from my main account for March"
- "Show me all payments made last week"
- "What payments have been received today?"

**Chart of Accounts**
- "Show me all expense accounts"
- "What bank accounts do I have in Xero?"
- "List all revenue accounts"

**Creating Records**
- "Create a draft invoice for Acme Corp with line items for consulting services"
- "Add a new customer named ABC Supplies with email abc@example.com"
- "Create a quote for $5,000 worth of services expiring next month"

**Inventory and Items**
- "Show me all inventory items"
- "What's the price for item code WIDGET-001?"
- "List all service items in my inventory"

### Tips for Getting the Best Results

1. **Be Specific with Dates**: Use clear date ranges like "last month", "March 2024", or "from 1 Jan to 31 Mar"

2. **Use Common Terminology**: LedgerBot understands accounting terms like "payables", "receivables", "chart of accounts", etc.

3. **Ask Follow-Up Questions**: You can refine queries in the same conversation:
   - "Show me all invoices" → "Now filter to just unpaid ones" → "Show me those from Acme Corp only"

4. **Request Multiple Details**: Combine related data in one query:
   - "Show me overdue invoices and include the customer contact details"

5. **Specify Status When Needed**: Invoices can be DRAFT, AUTHORISED, PAID, or VOIDED. Specify if you need a particular status:
   - "Show me all authorised invoices from last quarter"

6. **Use Xero Terminology**: If you're familiar with Xero, use its exact terms (e.g., "contacts" instead of "clients", "credit notes" instead of "refunds")

### What Data Is Available

LedgerBot can access the following Xero data:

- Invoices (sales invoices)
- Bills (purchase invoices)
- Credit notes
- Contacts (customers and suppliers)
- Payments
- Bank transactions
- Chart of accounts
- Manual journal entries
- Tax rates
- Inventory items
- Quotes
- Contact groups
- Financial reports (profit and loss, balance sheet, trial balance)
- Aged receivables and payables reports

### Creating and Updating Records

LedgerBot can help you create and update certain Xero records:

**You can create:**
- Draft or authorised invoices
- Quotes for customers
- Credit notes
- New contacts (customers or suppliers)
- Payments against invoices

**You can update:**
- Draft invoices (you cannot update authorised invoices)
- Draft credit notes
- Contact details (name, email, phone, addresses)

**Important**: LedgerBot creates invoices and credit notes in DRAFT status by default unless you specifically request AUTHORISED status. This gives you a chance to review records in Xero before they're finalised.

**Example Creation Requests**:
- "Create a draft invoice for ABC Supplies for $1,500 of consulting services, due in 14 days"
- "Add a new supplier called Office Supplies Ltd with email orders@officesupplies.com.au"
- "Record a payment of $1,200 against invoice INV-001 from my main bank account"

---

## Managing Your Connection

### Viewing Connection Status

To check your Xero connection:

1. Go to **Settings > Integrations**
2. Find the Xero card
3. You'll see:
   - **Organisation name**: The Xero company currently connected
   - **Token expiry date**: When your access token expires (usually 30 days)
   - **Status**: Connected or Available

### Understanding Token Expiry and Automatic Refresh

Your Xero connection uses secure access tokens that expire after 30 days. However, you don't need to worry about this:

- **Automatic Refresh**: LedgerBot automatically renews your token when it's close to expiring (within 5 minutes)
- **No Action Needed**: As long as you use the integration regularly, you won't need to reconnect
- **If Token Expires**: If you don't use Xero through LedgerBot for over 30 days, you may need to reconnect by clicking "Connect" again

### Switching Between Organisations

If you manage multiple Xero organisations:

1. **Go to Settings > Integrations**
2. Find the Xero integration card
3. Use the **"Switch Organisation"** dropdown
4. Select the organisation you want to use
5. Click to confirm

The active organisation is shown with "(Active)" next to its name. All subsequent queries will use data from this organisation until you switch again.

### Disconnecting Xero

If you need to disconnect LedgerBot from Xero:

1. **Go to Settings > Integrations**
2. Find the Xero card
3. Click the red **"Disconnect"** button
4. Confirm you want to disconnect

**What Happens When You Disconnect:**
- LedgerBot immediately revokes its access to your Xero data
- Your connection details are deactivated in LedgerBot's database
- All encrypted tokens are removed
- You can reconnect at any time by clicking "Connect" again

**Note**: Disconnecting from LedgerBot also removes the integration from the Xero side. You don't need to separately revoke access in your Xero settings.

---

## Troubleshooting

### Connection Failed

**Problem**: You see an error message after authorising Xero.

**Solutions**:
1. Check you're logged into the correct Xero organisation
2. Ensure you clicked "Allow access" on the Xero authorisation screen
3. Try disconnecting and reconnecting
4. Clear your browser cache and try again
5. Check that you have administrative access to your Xero organisation

### "No Active Xero Connection Found" Error

**Problem**: LedgerBot says you don't have an active connection, but you recently connected.

**Solutions**:
1. Go to Settings > Integrations and verify the status shows "connected"
2. If it shows "available", click "Connect" to reconnect
3. If you have multiple organisations, ensure the correct one is marked as active
4. Try refreshing the page and asking your question again

### Token Expired

**Problem**: You get an error that your Xero token has expired.

**Solutions**:
1. LedgerBot should automatically refresh tokens, but if it fails:
2. Go to Settings > Integrations
3. Click "Disconnect"
4. Click "Connect" again to create a fresh connection
5. Re-authorise access when redirected to Xero

### Queries Return No Data

**Problem**: Your questions don't return any results, even though you know data exists in Xero.

**Solutions**:
1. Check you're asking about the correct organisation (if you have multiple)
2. Verify the date ranges in your query match when the data was created
3. Try being more specific with your query (e.g., specify invoice status)
4. Ensure the data actually exists in Xero by checking directly
5. Ask LedgerBot "What's my Xero organisation name?" to confirm the connection is working

### Can't Create or Update Records

**Problem**: LedgerBot can't create invoices or update contacts.

**Possible Causes**:
1. **Draft Status Required**: You can only update DRAFT invoices and credit notes, not AUTHORISED ones
2. **Missing Required Fields**: Creating records requires specific information (contact ID, dates, line items, etc.)
3. **Permissions Issue**: Ensure LedgerBot was granted all requested permissions when you connected
4. **Validation Errors**: Xero may reject the record due to business rules (e.g., invalid account code, missing tax rate)

**Solutions**:
- Be specific in your request and include all required details
- Check the error message LedgerBot returns for hints about what's missing
- For invoices, ensure they're in DRAFT status if you want to update them
- Verify account codes and tax types exist in your Xero chart of accounts

### Wrong Organisation Connected

**Problem**: Queries return data from the wrong Xero organisation.

**Solutions**:
1. Go to Settings > Integrations
2. Use the "Switch Organisation" dropdown
3. Select the correct organisation
4. Confirm the change

---

## Privacy and Security

### How Your Data Is Protected

- **Encrypted Storage**: Your Xero access tokens are encrypted using AES-256-GCM encryption before being stored in LedgerBot's database
- **Secure Authentication**: Connection uses OAuth 2.0, the industry standard for secure authorisation
- **No Password Storage**: LedgerBot never sees or stores your Xero password
- **Automatic Token Expiry**: Access tokens expire after 30 days and must be renewed
- **Revocable Access**: You can disconnect at any time, immediately revoking LedgerBot's access

### What LedgerBot Can and Cannot Do

**LedgerBot CAN:**
- Read your accounting data (invoices, contacts, reports, etc.)
- Create new records (invoices, contacts, payments, etc.) when you ask
- Update DRAFT records when you request changes
- Generate financial reports from your Xero data

**LedgerBot CANNOT:**
- Delete transactions or records
- Update AUTHORISED or PAID invoices
- Access your Xero login credentials
- Change your Xero organisation settings
- Share your data with third parties (except as part of normal LedgerBot operation)

### Your Responsibilities

- **Keep Your Login Secure**: Protect your LedgerBot and Xero account credentials
- **Review Created Records**: Always check records created by LedgerBot in Xero before finalising them
- **Monitor Your Connection**: Regularly check that your connection is active and secure
- **Disconnect When Needed**: If you stop using LedgerBot, disconnect the integration

### Data Residency

- Your Xero data remains stored in Xero's systems (typically in your region)
- LedgerBot only requests data when you ask questions; it doesn't store your Xero accounting records
- Connection tokens are encrypted and stored securely in LedgerBot's database

---

## Support

### Getting Help

If you encounter issues not covered in this guide:

1. **Check Your Connection**: Go to Settings > Integrations and verify the Xero connection status
2. **Test with Simple Queries**: Try "What's my Xero organisation name?" to confirm basic connectivity
3. **Review Error Messages**: Read any error messages carefully for clues about what went wrong
4. **Try Reconnecting**: Sometimes disconnecting and reconnecting can resolve issues
5. **Contact Support**: Reach out to the LedgerBot support team with:
   - A description of the issue
   - The question or action you were attempting
   - Any error messages you received
   - Your organisation name (for verification)

### Known Limitations

- **Read/Create Only**: LedgerBot cannot delete Xero records
- **Draft Limitations**: Only DRAFT invoices and credit notes can be updated
- **No File Attachments**: File attachment features are planned for future releases
- **Rate Limits**: Xero may apply rate limits to API requests during heavy usage
- **Historical Data**: Very old transactions may take longer to retrieve

### Useful Tips

- **Date Formats**: When creating records, use YYYY-MM-DD format (e.g., 2024-03-15) for dates
- **Account Codes**: Know your chart of accounts codes when creating invoices or line items
- **Tax Types**: Familiarise yourself with your Xero tax type codes (e.g., GST, INPUT)
- **IDs vs Names**: Xero uses unique IDs internally; LedgerBot can help you find the ID for a contact if you know their name

---

## Related Features

### Context Files

You can upload accounting documents, invoices, and reports to LedgerBot's Context Files (Settings > Files). These files can be used alongside your Xero data to answer questions like "Compare this uploaded invoice to what's in Xero".

### Agent Workspaces

Explore LedgerBot's specialised agent workspaces for accounting automation:
- **Reconciliations Agent**: Match bank feeds and ledger transactions
- **Compliance Agent**: Track ATO obligations and BAS lodgements
- **Analytics Agent**: Create narrative-rich reports combining Xero data with insights

### Q&A Agent

The Q&A Agent can answer regulatory and compliance questions specific to Australian accounting, which complements your Xero data with expert knowledge about tax laws, Fair Work awards, and payroll obligations.

---

**Last Updated**: November 2025
**Version**: 1.0
**Applies To**: LedgerBot with Xero Integration (OAuth 2.0 Authorization Code Flow)
