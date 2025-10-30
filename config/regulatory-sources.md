# Regulatory Sources Configuration

This file defines regulatory sources to scrape. Each source must have:
- **Source Type:** web_scraping
- **URL:** The webpage to scrape
- **Update Frequency:** daily, weekly, monthly, quarterly
- **Priority:** high, medium, low
- **Category:** award, tax_ruling, payroll_tax, custom

---

## Australia (AU)

### Fair Work (Employment Law)

#### Minimum Wages
- **Source Type:** web_scraping
- **URL:** https://www.fairwork.gov.au/pay-and-wages/minimum-wages
- **Update Frequency:** weekly
- **Priority:** high
- **Category:** award

#### Modern Awards List
- **Source Type:** web_scraping
- **URL:** https://www.fairwork.gov.au/employment-conditions/awards/list-of-awards
- **Update Frequency:** weekly
- **Priority:** high
- **Category:** award

### Australian Taxation Office (ATO)

#### Income Tax Rulings
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/law/view/menu?docid=ITR/TaxRulings/
- **Update Frequency:** monthly
- **Priority:** high
- **Category:** tax_ruling

#### PAYG Withholding
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/payg-withholding
- **Update Frequency:** monthly
- **Priority:** high
- **Category:** tax_ruling

#### Superannuation Guarantee
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/businesses-and-organisations/super-for-employers/paying-super-contributions/how-much-super-to-pay
- **Update Frequency:** quarterly
- **Priority:** high
- **Category:** tax_ruling

### State Payroll Tax

#### New South Wales
- **Source Type:** web_scraping
- **URL:** https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Victoria
- **Source Type:** web_scraping
- **URL:** https://www.sro.vic.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Queensland
- **Source Type:** web_scraping
- **URL:** https://www.business.qld.gov.au/running-business/employing/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### South Australia
- **Source Type:** web_scraping
- **URL:** https://www.revenuesa.sa.gov.au/taxes-and-duties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Western Australia
- **Source Type:** web_scraping
- **URL:** https://www.wa.gov.au/organisation/department-of-finance/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Tasmania
- **Source Type:** web_scraping
- **URL:** https://www.sro.tas.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Australian Capital Territory
- **Source Type:** web_scraping
- **URL:** https://www.revenue.act.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Northern Territory
- **Source Type:** web_scraping
- **URL:** https://revenue.nt.gov.au/taxes-and-royalties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

---

## Future Expansion

### New Zealand (NZ)
(To be added)

### United Kingdom (UK)
(To be added)

### United States (US)
(To be added)