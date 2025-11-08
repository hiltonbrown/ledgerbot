# Document Management Agent - Security & Compliance Guide

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: Security Teams, Compliance Officers, System Administrators

> **Other Documentation**: See also [User Guide](./docmanagement-user-guide.md), [Technical Architecture](./docmanagement-technical-architecture.md), [Troubleshooting](./docmanagement-troubleshooting-faq.md)

---

## Table of Contents

1. [Security and Privacy](#security-and-privacy)
2. [Document Storage Security](#document-storage-security)
3. [AI Provider Data Handling](#ai-provider-data-handling)
4. [Access Control](#access-control)
5. [Data Encryption](#data-encryption)
6. [Retention Policies](#retention-policies)
7. [GDPR and Privacy Compliance](#gdpr-and-privacy-compliance)
8. [Recommendations for Users](#recommendations-for-users)

---

## Security and Privacy

This section provides comprehensive information about how LedgerBot protects your documents and respects your privacy.

---

## Document Storage Security

### Encryption at Rest

**What it means:**
All uploaded documents are stored in Vercel Blob Storage with encryption at rest. This means files are encrypted on disk using industry-standard AES-256 encryption.

**Why it matters:**
Even if someone gained physical access to the storage servers, they couldn't read your files without the encryption keys.

**Who has the keys:**
Vercel (the storage provider) manages encryption keys. LedgerBot doesn't have direct access to these keys.

### Encryption in Transit

**What it means:**
All uploads and downloads use HTTPS (TLS 1.3), ensuring data is encrypted while travelling between your browser and LedgerBot servers.

**Why it matters:**
This prevents anyone intercepting your network traffic (e.g., on public WiFi) from seeing your documents.

**TLS 1.3 benefits:**
- Faster handshake (quicker connections)
- Stronger encryption algorithms
- Protection against downgrade attacks

### Access Controls

**User Isolation:**
Documents are associated with your user ID in the database. All queries enforce this association, preventing other users from accessing your files.

**Database-Level Security:**
- Every query includes `WHERE userId = ?` clause
- Row-level security ensures data isolation
- No cross-user data leakage

**Admin Access:**
LedgerBot administrators do not have routine access to your documents. Access requires explicit permission (e.g., for support troubleshooting with your consent).

**Audit Logging:**
Administrative access to user data is logged for security audits and compliance.

---

## AI Provider Data Handling

### Which Providers Are Used?

LedgerBot uses AI providers via the Vercel AI Gateway:
- **Anthropic Claude** (default for most operations)
- **OpenAI GPT** (alternative model option)
- **Google Gemini** (alternative model option)
- **xAI Grok** (alternative model option)

### Data Sharing

**When you upload a document:**
1. Extracted text is sent to the AI provider for summarisation
2. The provider processes the text and returns structured output
3. According to provider policies (Anthropic, OpenAI, Google), **API data is not used to train their models**
4. Data is processed in real-time and not permanently stored by providers

**What gets sent:**
- Extracted text from your document
- Metadata about document structure
- Your question (when using chat)
- Conversation history (for context continuity)

**What doesn't get sent:**
- Your user ID or personal information
- The original PDF file (only extracted text)
- Other documents in your library
- Your Xero data (unless directly relevant to the question)

### Provider Privacy Policies

**Anthropic Claude:**
- Does not train on customer data
- Does not retain prompts or outputs for model training
- Enterprise API data is deleted after processing

**OpenAI GPT:**
- API data is not used for training (as of March 2023 policy change)
- Data may be retained for 30 days for abuse monitoring
- After 30 days, data is deleted

**Google Gemini:**
- API usage data is not used to train Google's models
- Data is processed and deleted after use
- Privacy controls available via Google Cloud

### Privacy Considerations

While providers don't train on your data, they do temporarily process it. If you have highly confidential documents, consider:

1. **Redacting sensitive information** before upload
   - Customer personal details
   - Bank account numbers (if not needed for analysis)
   - Confidential pricing or contract terms

2. **Using self-hosted AI models** (enterprise feature, contact support)
   - Run AI models on your own infrastructure
   - No data leaves your network
   - Higher cost but maximum privacy

3. **Processing such documents manually** without AI assistance
   - For ultra-sensitive documents, skip AI processing entirely

---

## Access Control (User Isolation)

### Database Isolation

**How it works:**
Every database query for context files includes a `WHERE userId = ?` clause, ensuring you only see your own documents.

**Example query:**
```sql
SELECT * FROM context_files
WHERE user_id = 'user-12345'
AND status = 'ready'
ORDER BY created_at DESC;
```

**Why it's secure:**
- Impossible to accidentally retrieve another user's documents
- Application code enforces isolation at every query
- No shared resources between users

### Blob Storage Isolation

**Storage paths:**
Files are stored with unique paths including your user ID:
```
context-files/{userId}/{timestamp}-{filename}
```

**Access control:**
Even if someone guessed a URL, Vercel Blob Storage access controls prevent unauthorised retrieval.

**Signed URLs:**
Download links are time-limited signed URLs that expire after use, preventing link sharing.

### Multi-Tenancy

**Architecture:**
LedgerBot is a multi-tenant application (many users, one database). Database-level isolation ensures complete separation between user data.

**Benefits:**
- Cost-effective (shared infrastructure)
- Easier updates (single application version)
- Secure (database enforces isolation)

**Trade-offs:**
- Not suitable for ultra-high-security scenarios (government, military)
- Single-tenant deployments available for enterprise (contact support)

---

## Data Encryption

### At Rest

**Database:**
- Encrypted at rest by the managed PostgreSQL provider
- Industry-standard AES-256 encryption
- Automatic key rotation
- Encrypted backups

**Blob Storage:**
- Encrypted at rest with AES-256
- Server-side encryption (SSE)
- Keys managed by Vercel

### In Transit

**HTTPS/TLS:**
- All HTTP requests use TLS 1.3
- No plain-text transmission of documents
- Certificate pinning prevents man-in-the-middle attacks

**API Calls:**
- AI provider API calls use HTTPS
- Vercel-to-provider connections secured with TLS

### Application-Level Encryption

**Current state:**
Currently, documents are not encrypted within the application itself (only by the storage provider).

**Why not:**
- Storage provider encryption is sufficient for most use cases
- Application-level encryption adds complexity and performance overhead

**Future plans:**
Application-level encryption (where LedgerBot encrypts before storing) is planned for enterprise features:
- Customer-managed encryption keys (CMEK)
- End-to-end encryption with user-controlled keys
- Zero-knowledge architecture (LedgerBot can't decrypt)

---

## Retention Policies

### Active Documents

**How long documents are kept:**
Documents remain in storage indefinitely while your account is active.

**Why:**
LedgerBot is designed as a long-term knowledge base, not temporary storage.

**User control:**
You can delete documents at any time to free up quota or for privacy reasons.

### Account Deletion

**If you delete your LedgerBot account:**
1. All documents are permanently deleted from storage
2. All database records are removed
3. All chat history is deleted
4. Deletion typically completes within 30 days

**Why 30 days:**
- Allows for accidental deletion recovery (if you change your mind)
- Time to process async deletion jobs
- Complete propagation across backup systems

**Requesting immediate deletion:**
Contact support for expedited deletion (compliance requirement).

### Backup Retention

**Database backups:**
Database backups may retain deleted data for up to 90 days for disaster recovery purposes.

**Why:**
- Protects against accidental data loss
- Enables point-in-time recovery
- Required for business continuity

**After 90 days:**
Backups are purged and data is permanently unrecoverable.

### Legal Holds

**When data is retained longer:**
In rare cases (legal requirements, fraud investigations), documents may be retained beyond normal deletion policies.

**User notification:**
You will be notified if your data is subject to a legal hold.

**Why it happens:**
- Court orders or subpoenas
- Regulatory investigations
- Fraud prevention

---

## GDPR and Privacy Compliance

LedgerBot complies with the General Data Protection Regulation (GDPR) and other privacy laws.

### Right to Access

**What it means:**
You have the right to access all personal data we hold about you.

**How to exercise:**
- Access all your uploaded documents via the LedgerBot interface (Settings > Files)
- Request a data export by contacting support

### Right to Deletion (Right to be Forgotten)

**What it means:**
You have the right to request deletion of your personal data.

**How to exercise:**
- Delete individual documents in the LedgerBot interface
- Delete your entire account to remove all data
- Request expedited deletion by contacting support

### Right to Portability

**What it means:**
You have the right to receive your data in a portable format.

**Current state:**
- You can download individual documents
- Bulk export is planned for future release

**Workaround:**
Contact support for a manual data export if needed urgently.

### Right to Rectification

**What it means:**
You have the right to correct inaccurate personal data.

**How to exercise:**
- Delete and re-upload corrected documents
- Update your profile information in Settings
- Contact support to correct database errors

### Privacy by Design

**Principles implemented:**
1. **Data minimisation**: Only necessary data is collected
2. **Purpose limitation**: Data used only for stated purposes
3. **Storage limitation**: You control retention via deletion
4. **Integrity and confidentiality**: Encryption and access controls
5. **Accountability**: Privacy policies and audit trails

### Data Processing Agreement (DPA)

**For enterprise customers:**
A Data Processing Agreement (DPA) is available detailing GDPR compliance measures.

**What it includes:**
- Data processing scope and purpose
- Security measures
- Sub-processor list (AI providers)
- Data breach notification procedures
- Liability and indemnification

**How to request:**
Contact sales@ledgerbot.com for DPA negotiation.

### Cross-Border Data Transfers

**Where data is stored:**
- Primary region: United States (Vercel US servers)
- AI processing: May involve EU or US servers depending on provider

**Transfer mechanisms:**
- Standard Contractual Clauses (SCCs) for EU data
- GDPR-compliant data processing agreements
- Compliance with regional privacy laws

### Data Protection Officer (DPO)

**Contact:**
For privacy inquiries, contact privacy@ledgerbot.com

**Responsibilities:**
- Monitor GDPR compliance
- Conduct privacy impact assessments
- Handle data subject requests
- Liaise with regulatory authorities

---

## Recommendations for Users

### Best Practices

**1. Redact Sensitive Info:**
Before uploading highly confidential documents, redact unnecessary personal information:
- Customer home addresses (if not needed)
- Private phone numbers or emails
- Confidential pricing or terms
- Personal health or financial details

**Tools for redaction:**
- Adobe Acrobat (permanent redaction)
- PDF Expert (Mac)
- Online redaction tools (use caution with sensitive docs)

**2. Use Strong Passwords:**
Secure your LedgerBot account with:
- Strong, unique password (12+ characters)
- Mix of uppercase, lowercase, numbers, symbols
- Password manager (1Password, LastPass, Bitwarden)
- Enable two-factor authentication if available

**3. Regular Cleanup:**
Delete documents you no longer need:
- Minimises your data footprint
- Reduces risk in case of breach
- Frees up storage quota

**Schedule:**
- Monthly review of uploaded documents
- Delete documents older than 6 months (unless needed)
- Archive critical documents locally before deleting

**4. Verify Sources:**
Only upload documents from trusted sources:
- Don't upload suspicious PDFs from unknown senders
- Scan documents for malware before uploading (if applicable)
- Be cautious with email attachments

**5. Backup Originals:**
Always keep original documents in secure backup storage:
- LedgerBot is for processing, not authoritative storage
- Use your accounting software for official records
- Maintain offline backups for critical documents

**Backup strategy:**
- Primary: Accounting software (Xero, MYOB, etc.)
- Secondary: Cloud storage (encrypted Google Drive, Dropbox)
- Tertiary: Local encrypted backup (external drive)

### Security Checklist

Use this checklist to ensure you're following security best practices:

- [ ] Account secured with strong, unique password
- [ ] Two-factor authentication enabled (when available)
- [ ] Only uploading necessary documents (not everything)
- [ ] Sensitive information redacted before upload
- [ ] Original documents backed up elsewhere
- [ ] Regular review and deletion of old documents
- [ ] Not sharing account credentials
- [ ] Accessing LedgerBot over secure networks (not public WiFi)
- [ ] Keeping browser and OS up to date
- [ ] Logging out when using shared computers

### Incident Response

**If you suspect a security issue:**
1. Immediately contact security@ledgerbot.com
2. Change your password
3. Review recent account activity (Settings > Activity)
4. Document what happened (timestamps, unusual behaviour)
5. Don't delete evidence until instructed

**What to report:**
- Unauthorised access to your account
- Suspicious login attempts
- Unexpected document deletions or modifications
- Phishing emails claiming to be from LedgerBot
- Potential data breaches

**Response time:**
Security issues are triaged immediately and investigated within 24 hours.

---

## Security Certifications and Compliance

### Current Certifications

**Vercel Infrastructure:**
- SOC 2 Type II certified
- ISO 27001 compliant
- GDPR compliant

**LedgerBot Application:**
- GDPR compliant (documented in DPA)
- Privacy by Design principles
- Regular security audits

### Planned Certifications

**Future compliance goals:**
- SOC 2 Type II for LedgerBot application (in progress)
- ISO 27001 certification (planned)
- PCI DSS compliance (if handling payments)

### Security Audits

**Frequency:**
- Annual penetration testing
- Quarterly vulnerability scans
- Continuous monitoring for threats

**Third-party audits:**
Independent security audits conducted by certified firms.

---

## Reporting Security Vulnerabilities

### Responsible Disclosure

**If you discover a security vulnerability:**
Email security@ledgerbot.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your contact information

**Please do NOT:**
- Publicly disclose the vulnerability before we've patched it
- Exploit the vulnerability for malicious purposes
- Access other users' data

### Bug Bounty Program

**Status:**
Currently no formal bug bounty program.

**Recognition:**
Researchers who responsibly disclose vulnerabilities will be acknowledged (with permission) in our security hall of fame.

**Future plans:**
Formal bug bounty program planned for 2025.

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Related**: [User Guide](./docmanagement-user-guide.md) | [Technical Architecture](./docmanagement-technical-architecture.md) | [Troubleshooting](./docmanagement-troubleshooting-faq.md)
**Feedback**: Please send security or privacy feedback to security@ledgerbot.com
