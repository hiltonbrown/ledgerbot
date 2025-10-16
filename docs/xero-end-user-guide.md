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

### Organisation Information

**Get organisation details:**
```
What's my Xero organisation name?
Show me my organisation details
Get my organisation address
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
- **Bank Transactions**: ACTIVE, ARCHIVED

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

## Frequently Asked Questions

### Can I edit data in Xero through LedgerBot?

Currently, LedgerBot provides read-only access to Xero. You can view invoices, contacts, and transactions, but cannot create or modify them through chat.

### How often does data sync?

Data is not synced - it's fetched in real-time from Xero when you ask questions. This ensures you always see the most current data.

### Can I connect multiple Xero organisations?

Currently, you can only have one active Xero organisation connected at a time. To switch organisations, disconnect and reconnect.

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
- Generate reports based on Xero information
- Combine Xero data with other LedgerBot features
- Use specialized agent workspaces for accounting automation

Explore the power of conversational accounting with your Xero data!
