# DocManagement Agent UI Improvement Suggestions

The current `/agents/docmanagement` workspace introduces comprehensive flows for PDF intake, summarisation, guided questions, and chat. To further refine usability and ensure LedgerBot customers can confidently navigate the experience, consider the following enhancements:

## 1. Clarify Workflow Phases
- **Visual Timeline**: Add a horizontal stepper or breadcrumb to reinforce the sequential flow (Upload → Summarise → Review Questions → Chat). This will help users understand where they are in the process and what actions remain.
- **State-specific Panels**: Conditionally collapse or fade sections that are not yet relevant (e.g., hide the summary/questions cards until an upload succeeds). This keeps focus on the current phase and reduces cognitive load.

## 2. Strengthen Feedback During Long Operations
- **Progress Indicators**: Replace the single spinner with contextual progress for extraction, summarisation, and question generation (e.g., skeleton loaders or staged status updates).
- **Inline Toasts or Banners**: Surface success/error alerts near the action area so users receive immediate confirmation without scanning the page.

## 3. Improve Summary and Question Readability
- **Typography Hierarchy**: Introduce clearer heading levels and spacing within the summary card to distinguish between sections, highlights, and system notes.
- **Guided Question Grouping**: Organise generated questions into categories such as "Financials", "Compliance", and "Follow-ups" to make scanning easier for busy bookkeepers.

## 4. Optimise the Chat Experience
- **Message History Context**: Highlight which responses draw from the summary vs. raw extraction by adding subtle badges or tooltips, reinforcing transparency.
- **Suggested Prompts**: Provide quick-start chat prompts (chips/buttons) based on the generated questions to encourage follow-up exploration without typing.

## 5. Enhance File Management Controls
- **Recent Uploads Drawer**: Offer access to previously processed documents (via context file IDs) so teams can reopen artefacts without re-uploading.
- **Upload Validation UI**: Surface metadata (file size, token estimate, OCR requirement) in a dedicated panel with icons and colour coding to communicate risk or next steps at a glance.

## 6. Support Collaboration and Accountability
- **Activity Log Panel**: Display recent actions (uploads, validations, chats) with timestamps and user avatars to support multi-user bookkeeping workflows.
- **Export/Share Options**: Add buttons to export summaries or share guided question sets directly with clients via existing LedgerBot artifact channels.

## 7. Accessibility and Responsiveness
- **Keyboard Navigation**: Ensure focus states are prominent, inputs announce status updates via ARIA live regions, and toggles are reachable without a mouse.
- **Responsive Layout**: Stack cards vertically on mobile, with sticky action controls (upload button, ask question form) for quicker access in constrained viewports.

## 8. Future Enhancements for Trust and Compliance
- **Confidence Visualisation**: Elevate the validation queue into an interactive chart or table with filters for risk-based prioritisation.
- **Document Source Attribution**: Show snippets of the underlying text when answering questions, giving auditors confidence in the provenance of insights.

These improvements build on the strong functional foundation already in place, guiding small business users through complex document reviews with greater clarity, speed, and trust.
