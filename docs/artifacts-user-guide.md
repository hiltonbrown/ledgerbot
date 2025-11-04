# Artifacts and Documents User Guide

## Overview

Artifacts are AI-generated documents that appear in a special side panel during your conversations with LedgerBot. When you ask the AI to create content like reports, code, spreadsheets, or formatted text, it generates an "artifact" that you can view, edit, and save.

### What Are Artifacts?

Think of artifacts as living documents that the AI creates and updates in real-time as you chat. Instead of just seeing plain text in the chat, you get a fully formatted document that appears alongside the conversation.

**Example**: You ask "Create a profit and loss report template", and LedgerBot generates a formatted document that appears in a side panel. You can then ask "Add a section for operating expenses" and watch the document update live.

### Types of Artifacts

LedgerBot can create four types of artifacts:

1. **Text Documents**: Formatted text with headings, lists, and paragraphs (like reports, letters, or procedures)
2. **Code**: Programming code with syntax highlighting (Python, JavaScript, SQL, etc.)
3. **Spreadsheets**: Tables and data grids similar to Excel (for financial data, inventories, etc.)
4. **Images**: AI-generated images and diagrams (future feature)

### Why Use Artifacts?

**Real-Time Creation**: Watch documents build as the AI generates them, word by word

**Easy Editing**: Make changes directly in the artifact or by chatting with the AI

**Version Control**: Every change is saved as a new version, so you can revert if needed

**Export and Save**: Download artifacts or copy content to use elsewhere

**Collaboration**: Continue refining artifacts through natural conversation

---

## Getting Started

### Creating Your First Artifact

Artifacts are created automatically when you ask LedgerBot to generate certain types of content.

**To create a text document**, ask:
- "Create a business proposal template for consulting services"
- "Write a privacy policy for an Australian small business"
- "Draft a client welcome letter"

**To create code**, ask:
- "Write Python code to analyse a CSV file of sales data"
- "Create a JavaScript function to calculate GST"
- "Generate SQL to query invoice data"

**To create a spreadsheet**, ask:
- "Create a budget template for a small business"
- "Generate a timesheet table for employees"
- "Make a price list with columns for product, description, and price"

### What Happens When an Artifact Is Created

1. **The chat panel moves left**: Your conversation history shifts to a narrower left panel
2. **The artifact appears on the right**: A large panel opens showing the generated document
3. **Real-time updates**: You see the content appear word by word as the AI generates it
4. **Status indicator**: The artifact shows "streaming" while being generated, then switches to "idle" when complete

---

## Working with Artifacts

### Viewing Artifacts

Once created, an artifact displays:

- **Title**: The document name (top of the artifact panel)
- **Last updated**: Timestamp showing when the artifact was last modified
- **Content area**: The main document view
- **Action buttons**: Options to manage the artifact (top right)

**Desktop View**: Artifact appears in a large right panel with the chat on the left

**Mobile View**: Artifact takes up the full screen with a back button to return to chat

### The Artifact Interface

**Close Button** (X icon, top left):
- Closes the artifact panel
- Returns you to the full-width chat view
- Artifact is saved automatically and can be reopened

**Title and Timestamp** (top center):
- Shows the artifact name
- Displays "Updated X minutes ago"
- Shows "Saving changes..." when edits are being saved

**Action Menu** (three dots icon, top right):
- **Copy**: Copy the entire artifact content to your clipboard
- **Download**: Save the artifact as a file to your computer
- **Version history**: View and restore previous versions

### Editing Artifacts

You can edit artifacts in two ways:

**Method 1: Direct Editing** (for text and code artifacts)

1. Click directly in the content area
2. Type or delete text as needed
3. Changes are automatically saved after 2 seconds of inactivity
4. You'll see "Saving changes..." while the save is in progress

**Method 2: Chat Commands** (for all artifact types)

Ask the AI to make changes:
- "Add a section on payment terms"
- "Change the heading to 'Executive Summary'"
- "Remove the last paragraph"
- "Format this as a numbered list"

The AI will update the artifact in real-time based on your instructions.

---

## Document Types in Detail

### Text Documents

Text artifacts are formatted documents with:
- Headings (H1, H2, H3)
- Paragraphs
- Bullet and numbered lists
- Bold and italic text
- Tables

**Best For**:
- Reports and proposals
- Policies and procedures
- Letters and emails
- Meeting minutes
- Business plans

**Example Requests**:
- "Create a monthly board report template"
- "Write a data privacy policy compliant with Australian regulations"
- "Draft a contractor agreement for bookkeeping services"

### Code Artifacts

Code artifacts display programming code with:
- Syntax highlighting (colours for keywords, strings, comments)
- Line numbers
- Copy-to-clipboard button
- Support for multiple languages

**Supported Languages**:
- Python
- JavaScript/TypeScript
- SQL
- HTML/CSS
- And many more

**Best For**:
- Data analysis scripts
- API integrations
- Database queries
- Automation scripts
- Web components

**Example Requests**:
- "Write Python code to parse invoice data from a CSV"
- "Create a JavaScript function to validate Australian ABN numbers"
- "Generate SQL to summarise sales by month"

### Spreadsheet Artifacts

Spreadsheet artifacts are interactive tables with:
- Rows and columns
- Editable cells
- CSV import/export
- Basic calculations
- Question-answering capability (Q&A feature)

**Best For**:
- Budgets and forecasts
- Inventory lists
- Price lists
- Timesheets
- Data summaries

**Example Requests**:
- "Create a budget template with categories for income and expenses"
- "Generate a product inventory sheet with SKU, name, quantity, and price"
- "Make a timesheet with employee name, date, hours worked, and rate"

**Spreadsheet Q&A Feature**:
Once you've created a spreadsheet or uploaded CSV data, you can ask questions about it:

- "What's the total revenue in this spreadsheet?"
- "Which products have the highest sales?"
- "Show me rows where quantity is below 10"

The AI analyses the spreadsheet data and provides answers with specific cell references and summaries.

---

## Advanced Features

### Version History

Every time you edit an artifact (either directly or through chat), a new version is created.

**Viewing Version History**:
1. Click the **three dots icon** (top right of artifact)
2. You'll see previous versions with timestamps
3. Use the **arrow buttons** to navigate between versions
4. Click **"Latest"** to return to the most recent version

**Comparing Versions**:
1. Navigate to an older version
2. Click the **"Diff" toggle** (if available)
3. See highlighted changes between the current view and the latest version
4. Green = added content
5. Red = removed content

**Restoring Previous Versions**:
- Currently, versions are view-only
- To restore an old version, navigate to it and copy the content
- Create a new artifact by pasting the content

### Document Suggestions

For text artifacts, you can request AI-powered editing suggestions.

**How to Request Suggestions**:
- Say "Give me suggestions to improve this document"
- Or click the suggestions button in the toolbar (if available)

**What You Get**:
- Specific edits with before/after text
- Descriptions of what each change improves
- Multiple suggestions (typically 3-5)

**Reviewing Suggestions**:
- Each suggestion shows:
  - Original text
  - Suggested replacement
  - Explanation of the improvement
- Accept suggestions by editing the document directly
- Ignore suggestions you don't want

### The Toolbar

At the bottom of the artifact panel, you'll find a toolbar with quick actions:

**Regenerate**: Ask the AI to recreate the entire artifact from scratch with new instructions

**Improve**: Request general improvements to the content (clarity, formatting, completeness)

**Shorten**: Make the content more concise

**Lengthen**: Expand the content with more detail

These tools use natural language processing to modify the artifact without you needing to type specific instructions.

---

## Saving and Exporting

### Automatic Saving

All artifacts are automatically saved to your account:
- Every edit triggers a save after 2 seconds
- No "Save" button needed
- All versions are kept for reference
- Documents persist across sessions

### Downloading Artifacts

**For Text Documents**:
1. Click the **three dots menu** (top right)
2. Select **Download**
3. File is saved as a `.txt` or `.md` file (depending on format)

**For Code Artifacts**:
1. Use the **Copy** button to copy code to clipboard
2. Paste into your code editor or IDE
3. Or use the Download option to save as a file with appropriate extension (`.py`, `.js`, etc.)

**For Spreadsheets**:
1. Click the **Export** or **Download** button
2. File is saved as CSV (`.csv`)
3. Open in Excel, Google Sheets, or any spreadsheet application

### Copying Content

**Quick Copy** (all artifact types):
1. Click the **three dots menu**
2. Select **Copy**
3. Entire artifact content is copied to clipboard
4. Paste anywhere (email, document, notes app)

**Selective Copy** (text and code):
1. Highlight specific text with your mouse
2. Right-click and select **Copy**
3. Or use keyboard shortcut: Ctrl+C (Windows) or Cmd+C (Mac)

---

## Common Workflows

### Workflow 1: Creating a Business Report

1. **Start the conversation**: "Create a monthly financial report template for a small business"
2. **Review the initial draft**: The AI generates a basic structure in the artifact panel
3. **Add details**: "Include sections for revenue, expenses, profit margin, and cash flow"
4. **Customize**: "Add a chart placeholder for revenue trends"
5. **Refine**: "Make the executive summary more detailed"
6. **Export**: Download the final report as a text file

### Workflow 2: Building a Budget Spreadsheet

1. **Request creation**: "Create a personal budget spreadsheet with income and expense categories"
2. **Populate data**: Manually edit cells to add your actual figures
3. **Add calculations**: "Add a row that calculates total income and total expenses"
4. **Analyse**: "What percentage of my income goes to rent?"
5. **Export**: Download as CSV to import into Excel

### Workflow 3: Generating Code for Data Analysis

1. **Describe your need**: "Write Python code to read a CSV file of invoices and calculate total revenue by month"
2. **Review the code**: Check the generated code in the artifact
3. **Request changes**: "Add error handling for missing values"
4. **Test**: Copy the code and run it in your Python environment
5. **Iterate**: "Modify the code to also calculate average invoice value"

### Workflow 4: Drafting a Policy Document

1. **Create draft**: "Write a work-from-home policy for an Australian small business"
2. **Add specifics**: "Include sections on equipment, communication expectations, and performance measurement"
3. **Request suggestions**: "Give me suggestions to improve this policy"
4. **Review suggestions**: Evaluate each suggested edit
5. **Apply changes**: Either accept suggestions by editing or ask the AI to incorporate them
6. **Finalize**: Download the completed policy

---

## Troubleshooting

### Artifact Won't Open or Load

**Problem**: You clicked to view an artifact but it doesn't appear.

**Solutions**:
1. **Refresh the page**: Browser cache may be stale
2. **Check internet connection**: Artifacts require active connection to load
3. **Try a different browser**: Some browser extensions interfere with artifacts
4. **Clear browser cache**: Old cached data may conflict

### Edits Not Saving

**Problem**: You make changes but they don't persist.

**Solutions**:
1. **Wait 2 seconds**: Saves happen automatically after a short delay
2. **Check for "Saving changes..." message**: Confirms save is in progress
3. **Ensure you're online**: Saving requires internet connection
4. **Try editing via chat**: Instead of direct editing, ask the AI to make the change

### Artifact Shows Blank or Garbled Content

**Problem**: Content doesn't display correctly or shows as empty.

**Solutions**:
1. **Check version history**: Navigate to an earlier version to see if content exists
2. **Refresh the page**: Browser rendering issue
3. **Try the "Regenerate" option**: Ask the AI to recreate the content

### Can't Find a Previous Artifact

**Problem**: You created an artifact in a past conversation but can't access it now.

**Solutions**:
1. **Return to the original chat**: Artifacts are tied to specific conversations
2. **Check chat history**: Find the conversation where you created the artifact
3. **Search your chats**: Use the search feature to find chats containing the artifact title

### Spreadsheet Q&A Not Working

**Problem**: You ask questions about your spreadsheet but get errors or no response.

**Solutions**:
1. **Ensure spreadsheet has data**: Q&A requires at least a few rows
2. **Check column headers**: Headers help the AI understand your data structure
3. **Use specific questions**: Ask "What's the total in column B?" rather than vague queries
4. **Verify CSV format**: Ensure data is properly formatted with commas separating columns

### Version History Shows Multiple Similar Versions

**Problem**: Lots of versions that look the same.

**Explanation**: Each auto-save creates a new version. This is normal for actively edited documents.

**Solution**: Use version timestamps to identify major milestones. Future versions may consolidate minor edits.

---

## Best Practices

### Creating Effective Artifacts

1. **Be Specific in Requests**:
   - Good: "Create a budget template with monthly columns for revenue, COGS, and operating expenses"
   - Bad: "Make a budget"

2. **Start Simple, Then Iterate**: Begin with a basic structure and refine through conversation

3. **Use Templates**: Ask for industry-standard templates (e.g., "Create a P&L template following Australian accounting standards")

4. **Name Artifacts Clearly**: Give meaningful titles so you can find them later

### Editing Artifacts

1. **Use Chat for Complex Changes**: It's often easier to describe changes than to manually edit
2. **Make One Change at a Time**: Helps you track what was modified in version history
3. **Review Before Finalizing**: Check the entire document before exporting

### Managing Versions

1. **Note Major Milestones**: Before making big changes, make a note of the current version timestamp
2. **Don't Worry About Minor Versions**: Auto-saves create many versions; focus on significant changes
3. **Compare Before Accepting Edits**: Use diff view to see exactly what changed

### Collaboration and Sharing

1. **Export for Sharing**: Download artifacts to share with colleagues via email or cloud storage
2. **Copy-Paste for Quick Sharing**: Use the copy function to paste content into emails or documents
3. **Describe Intent Clearly**: When asking for changes, explain what you want to achieve (not just what to change)

---

## Frequently Asked Questions

**Q: What's the difference between artifacts and context files?**
A: Artifacts are documents created by the AI during conversations. Context files are documents you upload to provide background information to the AI.

**Q: Can I edit artifacts on mobile?**
A: Yes, but direct editing is limited. Use chat commands to request changes instead.

**Q: How many artifacts can I create?**
A: There's no strict limit, but each artifact is tied to a conversation. Managing dozens of conversations with artifacts may become unwieldy.

**Q: Do artifacts work offline?**
A: No, artifacts require an active internet connection to load, save, and update.

**Q: Can I share an artifact with someone else?**
A: Not directly. Export the artifact and share the file via email, cloud storage, or other methods.

**Q: How long are artifacts stored?**
A: Artifacts are stored indefinitely as long as your account is active and the conversation remains.

**Q: Can I delete an artifact?**
A: Not individually. Artifacts are tied to conversations. Deleting a conversation deletes all its artifacts.

**Q: Can artifacts include images or charts?**
A: Currently, charts and images can be described or represented as placeholders. Future versions may support embedded visuals.

**Q: What happens if I close the artifact panel?**
A: The artifact is automatically saved. You can reopen it by returning to the conversation and scrolling to where it was created.

**Q: Can I print artifacts?**
A: Yes. Download the artifact and print the file, or use your browser's print function while viewing the artifact.

---

## Support

If you encounter issues not covered in this guide:

1. **Check artifact status**: Ensure it shows "idle" not "streaming" or "error"
2. **Review error messages**: Read any error messages for specific guidance
3. **Try regenerating**: Use the regenerate option to recreate the artifact
4. **Contact Support**: Reach out with:
   - Description of the issue
   - Artifact title and type
   - What you were trying to accomplish
   - Error message (if any)

---

## Related Features

**Context Files**: Upload documents to provide persistent background information across all conversations. See the Context Files User Guide.

**Agent Workspaces**: Specialized AI agents for accounting tasks may generate artifacts specific to their workflows (like reconciliation reports or compliance summaries).

**Suggestions System**: Request AI-powered editing suggestions for text artifacts to improve clarity, grammar, and structure.

---

**Last Updated**: November 2025
**Version**: 1.0
**Applies To**: LedgerBot Artifacts and Document Generation System
