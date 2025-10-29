# Xero Integration - End User Guide

## Overview

LedgerBot's Xero integration allows you to access your accounting data directly through natural conversation with the AI assistant. Once connected, you can ask questions about invoices, contacts, bank transactions, and more without leaving the chat interface.

## Getting Started

### Prerequisites

Before connecting Xero to LedgerBot, you'll need:
- An active Xero account with appropriate permissions
- Access to at least one Xero organisation
- Admin or Standard user role in Xero (Advisor or Read-only roles may have limited access)

### Connecting Your Xero Account

1. **Navigate to Settings**
   - Click on your profile icon in the top right
   - Select "Settings" from the dropdown menu
   - Go to "Integrations" tab

2. **Connect Xero**
   - Find the Xero card in the "Accounting" section
   - Click the "Connect" button
   - You'll be redirected to Xero's login page

3. **Authorize Access**
   - Log in to your Xero account if not already logged in
   - Review the permissions LedgerBot is requesting:
     - Read invoices and transactions
     - Read contacts (customers and suppliers)
     - Read bank transactions
     - Read chart of accounts
     - Read journal entries
     - Access payroll information
   - Click "Allow access" to authorize

4. **Confirmation**
   - You'll be redirected back to LedgerBot
   - A success message will confirm the connection
   - Your Xero organisation name will be displayed in the integration card

### Selecting an Organisation

If you have multiple Xero organisations:
- LedgerBot will automatically connect to the first organisation in your list
- Currently, only one organisation can be active at a time
- To switch organisations, disconnect and reconnect Xero

## Using Xero in Chat

Once connected, you can ask LedgerBot questions about your Xero data naturally. The AI will automatically use the appropriate Xero tools to fetch and present information.

## Read Operations (Viewing Data)

### Invoice Queries

**View all invoices:**
```
Show me all my invoices
```

**Filter by status:**
```
List all unpaid invoices
Get all PAID invoices from last month
Show me DRAFT invoices
Show AUTHORISED invoices
```

**Filter by date:**
```
Show invoices from January 2024
Get all invoices between 2024-01-01 and 2024-03-31
List invoices from the last 30 days
```

**Get specific invoice:**
```
Get details for invoice INV-0001
Show me invoice with ID [invoice-id]
```

**Filter by customer:**
```
Show all invoices for [customer name]
Get invoices for contact ID [contact-id]
```

### Credit Note Queries

**View all credit notes:**
```
Show me all credit notes
List all credit notes
```

**Filter by status:**
```
Get all AUTHORISED credit notes
Show DRAFT credit notes from last month
List PAID credit notes
```

**Filter by date:**
```
Show credit notes from January 2024
Get credit notes between 2024-01-01 and 2024-03-31
```

### Payment Queries

**View all payments:**
```
Show me all payments
List payments from last month
```

**Filter by date:**
```
Get payments between 2024-01-01 and 2024-03-31
Show me this year's payments
List payments from last quarter
```

### Contact Queries

**List all contacts:**
```
Show me all my customers
List all suppliers
Get all my contacts
```

**Search contacts:**
```
Find contact named ABC Company
Search for contacts with email admin@example.com
Look up customer John Smith
```

**Get contact details:**
```
Get details for contact [contact-id]
Show me information about [customer name]
```

**View contact groups:**
```
Show me all contact groups
List my customer segments
Get all contact groups
```

### Account Queries

**View chart of accounts:**
```
Show me my chart of accounts
List all accounts
```

**Filter by type:**
```
Get all BANK accounts
Show me EXPENSE accounts
List REVENUE accounts
Show FIXED accounts
Get all LIABILITY accounts
List EQUITY accounts
Show DIRECTCOSTS accounts
Get OVERHEADS accounts
```

### Tax Rate Queries

**View tax rates:**
```
Show me all tax rates
List all GST rates
Get my tax configuration
```

### Bank Transaction Queries

**View bank transactions:**
```
Show me all bank transactions
Get transactions from last month
```

**Filter by account:**
```
Show transactions for [bank account name]
Get transactions for account ID [account-id]
```

**Filter by date:**
```
List bank transactions from 2024-01-01 to 2024-01-31
Show me this week's bank transactions
```

### Journal Entry Queries

**View journal entries:**
```
Show me all manual journals
List journal entries from last month
Get journals between 2024-01-01 and 2024-03-31
```

### Inventory Items and Services

**View all items:**
```
Show me all inventory items
List all products and services
```

**Search by code:**
```
Find item with code PROD-001
Get item details for [item-code]
```

### Quote Queries

**View all quotes:**
```
Show me all quotes
List all sales quotes
```

**Filter by status:**
```
Get all SENT quotes
Show ACCEPTED quotes from last month
List DRAFT quotes
Show DECLINED quotes
```

**Filter by date:**
```
Show quotes from January 2024
Get quotes between 2024-01-01 and 2024-03-31
```

### Aged Reports

**Aged receivables (outstanding customer invoices):**
```
Show aged receivables for [customer name]
Get aged receivables for contact ID [contact-id]
Show me overdue invoices for [customer name]
```

**Aged payables (outstanding supplier bills):**
```
Show aged payables for [supplier name]
Get aged payables for contact ID [contact-id]
Show me overdue bills for [supplier name]
```

### Organisation Information

**Get organisation details:**
```
What's my Xero organisation name?
Show me my organisation details
Get my organisation address
```

## Financial Reports

### Profit and Loss Report

**Get P&L for a period:**
```
Show me profit and loss from 2024-01-01 to 2024-12-31
Get P&L report for last year
Show revenue and expenses for Q1 2024
```

**Monthly comparison:**
```
Show me monthly P&L for 2024 with 12 periods
Get profit and loss with monthly breakdown from 2024-01-01 to 2024-12-31
```

**Quarterly comparison:**
```
Show quarterly P&L for 2024
Get P&L with quarterly timeframe from 2024-01-01 to 2024-12-31
```

### Balance Sheet Report

**Get balance sheet for a period:**
```
Show me balance sheet from 2024-01-01 to 2024-12-31
Get balance sheet as of 2024-12-31
Show assets, liabilities and equity for year end
```

**Monthly comparison:**
```
Show me monthly balance sheet for 2024 with 12 periods
Get balance sheet with monthly breakdown
```

### Trial Balance Report

**Get trial balance:**
```
Show me trial balance as of 2024-12-31
Get trial balance for today
Show all account balances as of [date]
```

## Write Operations (Creating and Updating Data)

LedgerBot also supports creating and updating records in Xero through natural conversation.

**Important Notes:**
- Write operations require appropriate user permissions in Xero
- Draft records can be updated; authorised/paid records cannot be modified
- All dates should be in YYYY-MM-DD format (e.g., 2024-01-15)
- Account codes must match your chart of accounts
- Tax types must match your Xero tax configuration
- The AI will guide you through required fields for each operation

### Creating Invoices

**Create a new invoice:**
```
Create an invoice for ABC Company dated 2024-01-15 due 2024-02-15 with:
- 5 hours of consulting at $150/hour to account 200
- Use tax type OUTPUT2
```

**Create draft invoice:**
```
Create a draft invoice for [customer name] with line items:
- Product ABC: quantity 10, unit price $50, account code 200
- Service XYZ: quantity 2, unit price $100, account code 400
```

**Create authorised invoice:**
```
Create an AUTHORISED invoice for [contact-id] dated today due in 30 days with consulting services
```

### Updating Invoices

**Update an existing invoice:**
```
Update invoice [invoice-id] to change the due date to 2024-02-28
```

**Update draft invoice:**
```
Update draft invoice [invoice-id] with new line items:
- Updated product quantity to 15
- Change unit amount to $55
```

### Creating Contacts

**Create a new customer:**
```
Create a contact named "New Customer Pty Ltd" with email info@newcustomer.com
```

**Create contact with full details:**
```
Create a contact named "ABC Corporation" with:
- Email: accounts@abc.com
- Phone: +61 2 1234 5678
- Street address: 123 Main St, Sydney NSW 2000
```

### Updating Contacts

**Update contact details:**
```
Update contact [contact-id] to change email to newemail@example.com
```

**Update contact address:**
```
Update contact [contact-id] with new street address: 456 New St, Melbourne VIC 3000
```

### Creating Payments

**Record a payment:**
```
Create a payment for invoice [invoice-id] from bank account [account-id] for $1500 dated 2024-01-20
```

**Record payment with reference:**
```
Record a payment of $2500 for invoice INV-001 on 2024-01-15 with reference "Payment via bank transfer"
```

### Creating Quotes

**Create a sales quote:**
```
Create a quote for [customer name] dated today expiring in 30 days with:
- Product A: 10 units at $100 each
- Product B: 5 units at $200 each
```

**Create draft quote:**
```
Create a DRAFT quote for [contact-id] with consulting services line item
```

### Creating Credit Notes

**Create a credit note:**
```
Create a credit note for [customer name] dated today with:
- Refund for Product X: quantity 2, unit price $50, account 200
```

**Create authorised credit note:**
```
Create an AUTHORISED credit note for [contact-id] with return items
```

### Updating Credit Notes

**Update draft credit note:**
```
Update credit note [credit-note-id] to change quantity to 3
```

**Update credit note status:**
```
Update draft credit note [credit-note-id] to AUTHORISED status
```

## Understanding AI Responses

### Data Format

The AI will present Xero data in easy-to-read formats:
- **Tables**: For lists of invoices, contacts, or transactions
- **Summaries**: Key information highlighted at the top
- **Details**: Comprehensive breakdowns for specific items

### Date Formats

When specifying dates in your queries:
- **ISO format**: `2024-01-31` (recommended)
- **Natural language**: "last month", "this year", "last 30 days"
- **Month names**: "January 2024", "March 2024"

### Status Values

Common status values you can use:
- **Invoices**: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
- **Credit Notes**: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
- **Quotes**: DRAFT, SENT, ACCEPTED, DECLINED
- **Bank Transactions**: ACTIVE, ARCHIVED

### Account Types

When filtering accounts by type, you can use:
- **BANK**: Bank accounts
- **CURRENT**: Current assets
- **EXPENSE**: Expense accounts
- **FIXED**: Fixed assets
- **CURRLIAB**: Current liabilities
- **LIABILITY**: Long-term liabilities
- **EQUITY**: Equity accounts
- **REVENUE**: Revenue/income accounts
- **DIRECTCOSTS**: Direct costs/COGS
- **OVERHEADS**: Overhead expenses

### Address Types

When creating or updating contacts with addresses:
- **POBOX**: PO Box address
- **STREET**: Street/physical address
- **DELIVERY**: Delivery address

## Managing Your Connection

### View Connection Status

1. Go to Settings > Integrations
2. The Xero card shows:
   - Connection status (Connected/Available)
   - Organisation name
   - Token expiry date

### Token Expiry

- Access tokens expire after 30 minutes
- Refresh tokens expire after 60 days
- LedgerBot automatically refreshes tokens before they expire
- If a token expires, you may need to reconnect

### Disconnecting Xero

1. Go to Settings > Integrations
2. Find the Xero card
3. Click "Disconnect"
4. Confirm the action

**Note**: Disconnecting will:
- Remove all stored Xero credentials
- Disable Xero tools in chat
- Require re-authorization to reconnect

### Reconnecting

If your connection fails or you need to reconnect:
1. Disconnect your current connection (if any)
2. Follow the connection steps again
3. Re-authorize access in Xero

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to Xero"
- **Solution**: Check your Xero account credentials
- Ensure you have appropriate permissions in Xero
- Try logging out of Xero and logging back in

**Problem**: "No organizations found"
- **Solution**: Verify you have access to at least one Xero organisation
- Check your Xero account status

**Problem**: "Invalid state error"
- **Solution**: Clear your browser cache and cookies
- Try the connection process again

### Query Issues

**Problem**: AI doesn't recognize Xero queries
- **Solution**: Check that Xero is connected (Settings > Integrations)
- Ensure you're asking about specific Xero data (invoices, contacts, etc.)
- Try rephrasing your question more explicitly

**Problem**: "No active Xero connection found"
- **Solution**: Your connection may have expired
- Reconnect Xero in Settings > Integrations

**Problem**: Data seems outdated
- **Solution**: Xero data is fetched in real-time, but there may be caching
- Try asking again with more specific parameters
- Check that the data exists in Xero

### Permission Issues

**Problem**: "Access denied" or "Insufficient permissions"
- **Solution**: Your Xero user role may not have required permissions
- Contact your Xero administrator to grant appropriate access
- Reconnect with a user account that has higher permissions

## Privacy and Security

### Data Storage

- **OAuth Tokens**: Encrypted with AES-256-GCM encryption
- **Xero Data**: Not stored in LedgerBot's database
- **Real-time Access**: Data is fetched directly from Xero when requested

### Data Access

- LedgerBot only accesses data you explicitly query
- No background data synchronization occurs
- Data is only retrieved during active chat sessions

### Revoking Access

To completely revoke LedgerBot's access to Xero:
1. Disconnect in LedgerBot (Settings > Integrations)
2. Log in to Xero
3. Go to Settings > Connected Apps
4. Find LedgerBot and click "Disconnect"

## Tips for Best Results

### Be Specific

Instead of:
```
Show me invoices
```

Try:
```
Show me all PAID invoices from January 2024
```

### Use Natural Language

The AI understands context:
```
Show me unpaid invoices, then show me the customers for those invoices
```

### Combine Filters

You can use multiple filters:
```
Get all AUTHORISED invoices for ABC Company from last quarter
```

### Follow-up Questions

The AI maintains context:
```
User: Show me all contacts
AI: [Lists contacts]
User: Get details for the first one
```

### Date Ranges

For better results, specify date ranges:
```
Show bank transactions from 2024-01-01 to 2024-01-31
```

### Working with Write Operations

**Before creating records:**
1. Verify you have the correct contact IDs (search contacts first)
2. Check your chart of accounts for correct account codes
3. Review tax rates to use the correct tax type codes

**Example workflow for creating an invoice:**
```
User: Show me all contacts named "ABC Company"
AI: [Shows contact with ID: abc-123]
User: Show me my chart of accounts
AI: [Shows account codes including 200 for Revenue]
User: Show me all tax rates
AI: [Shows OUTPUT2 for 10% GST]
User: Create an invoice for contact abc-123 dated 2024-01-15 due 2024-02-15 with consulting services, quantity 5, unit amount 150, account code 200, tax type OUTPUT2
```

**Best practices:**
- Create invoices as DRAFT first to review before authorising
- Always specify dates in YYYY-MM-DD format
- Include clear line item descriptions
- Use reference numbers for easy tracking
- Verify contact and account details before creating records

## Frequently Asked Questions

### Can I edit data in Xero through LedgerBot?

Yes! LedgerBot supports both reading and writing data to Xero. You can:
- **View** invoices, contacts, transactions, and reports
- **Create** new invoices, contacts, payments, quotes, and credit notes
- **Update** existing draft invoices, contacts, and credit notes

Note: Write operations require appropriate permissions in your Xero account.

### How often does data sync?

Data is not synced - it's fetched in real-time from Xero when you ask questions. This ensures you always see the most current data.

### Can I connect multiple Xero organisations?

Currently, you can only have one active Xero organisation connected at a time. To switch organisations, disconnect and reconnect.

### What records can I update?

You can update:
- **Draft invoices**: Change amounts, dates, line items, status
- **Draft credit notes**: Change amounts, dates, line items, status
- **Any contact**: Update name, email, phone, addresses

You cannot update:
- **Authorised invoices**: Once authorised, invoices are locked
- **Paid invoices**: Completed transactions cannot be modified
- **Bank transactions**: These are read-only
- **Journal entries**: Manual journals cannot be updated via API

### What permissions do I need in Xero?

For read operations:
- Standard user role or higher
- Read access to accounting data

For write operations:
- Standard user role or higher
- Permission to create and edit invoices, contacts, etc.
- Advisor and Read-only roles may have limited write access

Check with your Xero organisation administrator if you encounter permission errors.

### What happens if my Xero subscription expires?

If your Xero subscription expires, LedgerBot will not be able to access your data. Reconnect once your subscription is active again.

### Is my data secure?

Yes. All OAuth tokens are encrypted using industry-standard AES-256-GCM encryption. Xero data is fetched in real-time and not stored in LedgerBot's database.

### Can other users see my Xero data?

No. Your Xero connection is private to your account. Other LedgerBot users cannot access your Xero data.

## Support

If you encounter issues not covered in this guide:
1. Check the connection status in Settings > Integrations
2. Try disconnecting and reconnecting Xero
3. Contact LedgerBot support with:
   - Description of the issue
   - Error messages (if any)
   - Steps you've already tried

## What's Next?

With Xero connected, you can:
- Ask questions about your financial data
- View comprehensive financial reports (P&L, Balance Sheet, Trial Balance)
- Create and update invoices, contacts, payments, quotes, and credit notes
- Generate aged receivables and payables reports
- Combine Xero data with other LedgerBot features
- Use specialized agent workspaces for accounting automation

Explore the power of conversational accounting with your Xero data!

## Command Reference Summary

### Read Operations (27 tools)
1. `xero_list_invoices` - View and filter invoices
2. `xero_get_invoice` - Get specific invoice details
3. `xero_list_credit_notes` - View and filter credit notes
4. `xero_list_payments` - View payment history
5. `xero_list_contacts` - Search customers and suppliers
6. `xero_get_contact` - Get specific contact details
7. `xero_list_contact_groups` - View contact segments
8. `xero_list_accounts` - View chart of accounts
9. `xero_list_tax_rates` - View tax configuration
10. `xero_get_bank_transactions` - View bank transactions
11. `xero_list_journal_entries` - View manual journals
12. `xero_list_items` - View inventory items and services
13. `xero_list_quotes` - View sales quotes
14. `xero_get_aged_receivables` - View aged debtors report
15. `xero_get_aged_payables` - View aged creditors report
16. `xero_get_organisation` - View organisation details
17. `xero_get_profit_and_loss` - View P&L report
18. `xero_get_balance_sheet` - View balance sheet report
19. `xero_get_trial_balance` - View trial balance report

### Write Operations (10 tools)
20. `xero_create_invoice` - Create new invoices
21. `xero_update_invoice` - Update draft invoices
22. `xero_create_contact` - Create new customers/suppliers
23. `xero_update_contact` - Update contact details
24. `xero_create_payment` - Record payments
25. `xero_create_quote` - Create sales quotes
26. `xero_create_credit_note` - Create credit notes
27. `xero_update_credit_note` - Update draft credit notes

All commands work through natural language in the chat interface. The AI will automatically select and use the appropriate tool based on your request.
