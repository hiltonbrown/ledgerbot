# Workflow 1: Automated Invoice Processing and Coding

## Overview

LedgerBot's AI-powered invoice processing workflow automatically analyses incoming supplier invoices, extracts key data, matches transactions to purchase orders, assigns correct account codes based on your historical patterns and vendor relationships, and creates draft bills in Xero for quick approval.

This workflow eliminates manual data entry, reduces coding errors, and ensures consistent application of your chart of accounts across all supplier bills.

## How It Works

1. **Document Upload**: Upload supplier invoices (PDF, image, or email forward)
2. **AI Extraction**: LedgerBot extracts vendor details, amounts, line items, GST, and invoice metadata
3. **Intelligent Matching**: Matches to existing purchase orders or previous supplier transactions
4. **Smart Coding**: Assigns account codes based on historical patterns, vendor relationships, and transaction descriptions
5. **Draft Creation**: Creates draft bills in Xero with all details pre-filled for your review and approval

## Prerequisites

- Active Xero connection established
- Supplier invoices uploaded as context files or provided during conversation
- Historical transaction data in Xero for pattern learning

## Step-by-Step Guide

### 1. Upload Your Invoice

You can provide invoices to LedgerBot in several ways:
- Upload PDF or image files directly in the chat
- Forward supplier emails to your LedgerBot inbox (if configured)
- Reference previously uploaded context files

### 2. Request Processing

Use one of the example prompts below to initiate processing. Be specific about what you want LedgerBot to do with the invoice.

### 3. Review AI Suggestions

LedgerBot will present:
- Extracted invoice details
- Suggested account codes with confidence levels
- Matched purchase orders or previous transactions
- GST treatment verification
- Any potential issues or anomalies

### 4. Approve or Adjust

Review the suggestions and either:
- Approve for immediate posting to Xero
- Request adjustments to coding or details
- Ask questions about specific line items

### 5. Confirmation

Once approved, LedgerBot creates the draft bill in Xero and provides confirmation with the bill reference number.

## Example Prompts

### Prompt 1: Basic Invoice Processing
```
I have a supplier invoice from Office National for $847.50 including GST.
Can you process this invoice, extract the details, suggest the correct
account codes, and create a draft bill in Xero?
```

### Prompt 2: Bulk Invoice Processing
```
I've uploaded 12 supplier invoices in my context files. Please process
all of them, assign appropriate account codes based on our historical
patterns, and create draft bills in Xero. Flag any invoices where you're
uncertain about the coding.
```

### Prompt 3: Invoice with Purchase Order Matching
```
Process this invoice from BuildCorp for $15,450. Check if it matches our
outstanding purchase order PO-2024-156. Verify the amounts match and create
the bill coded to our Construction in Progress account.
```

### Prompt 4: Recurring Supplier Pattern
```
This is another invoice from our IT provider, TechSupply Co. They always
invoice us monthly for software subscriptions. Can you process this invoice
using the same coding as their previous invoices and create the draft bill?
```

### Prompt 5: Complex Multi-Line Invoice
```
I have a detailed invoice from our wholesale supplier with 23 line items.
Some items are inventory purchases (code 310), some are packaging materials
(code 462), and some are freight charges (code 429). Can you analyse each
line item, assign the correct codes, and create the draft bill with all
line items properly categorised?
```

## Tips and Best Practices

### Improve Accuracy Over Time
- LedgerBot learns from your historical patterns. The more transactions in your Xero file, the better the coding suggestions
- Provide feedback when adjusting codes so the AI can refine its understanding
- Create consistent vendor records in Xero to improve matching accuracy

### Handle Exceptions Clearly
- If an invoice is unusual or one-off, tell LedgerBot explicitly: "This is a special one-time purchase"
- For new vendors, provide context: "This is our first invoice from this supplier, they provide marketing services"

### Batch Processing Efficiency
- Upload multiple invoices at once and request batch processing
- Ask LedgerBot to prioritise certain invoices: "Process the overdue invoices first"
- Use context files to maintain a queue of invoices to process

### Verification Steps
- Always review GST treatment, especially for mixed supply invoices
- Check that supplier ABN matches Xero contact records (LedgerBot can verify this)
- Confirm payment terms match your vendor agreements

### Integration with Other Workflows
- Combine with **Workflow 8: Month-End Procedures** to ensure all invoices are processed before period close
- Use **Workflow 6: Variance Analysis** to review unusual invoice amounts against budget
- Link to **Workflow 2: Bank Reconciliation** when matching invoice payments

## Common Questions

**Q: Can LedgerBot handle invoices in different formats?**
A: Yes, LedgerBot processes PDFs, images (JPG, PNG), and can extract data from various invoice layouts.

**Q: What happens if the account code suggestion is wrong?**
A: You can correct it before approval. Tell LedgerBot the correct code and why, and it will learn from this feedback.

**Q: Can I set up automatic approval for certain vendors?**
A: Currently, all bills are created as drafts requiring approval. This ensures you maintain control over all transactions.

**Q: Does this work with credit notes?**
A: Yes, LedgerBot can process supplier credit notes and create them in Xero as negative bills.

## Related Workflows

- **Workflow 2**: Intelligent Bank Reconciliation (match invoice payments)
- **Workflow 5**: Expense Claim Processing (similar process for employee expenses)
- **Workflow 8**: Automated Month-End Procedures (ensure all invoices processed)
- **Workflow 10**: Intelligent Document Filing (automatic attachment to Xero bills)

## Technical Notes

This workflow uses LedgerBot's Document Processing agent combined with Xero integration tools. The AI analyses document structure, extracts text using OCR when needed, and applies machine learning to your historical transaction patterns for intelligent coding suggestions.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero bill creation tools
- `lib/abr/` - ABN validation for supplier verification
- Agent architecture in `app/agents/docmanagement/`
