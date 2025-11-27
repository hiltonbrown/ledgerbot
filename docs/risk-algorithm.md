# Risk-Scoring Algorithm

This document describes the risk-scoring algorithm used by the A/R Agent to assess customer credit risk.

## Overview

The risk score is a value between **0.0 (Low Risk)** and **1.0 (High Risk)**. It is calculated based on a weighted sum of several factors derived from the customer's payment history over the last 24 months.

## Algorithm Factors & Weights

| Factor | Weight | Description | Normalization / Logic |
| :--- | :--- | :--- | :--- |
| **Late Payment Rate** | 30% | Frequency of late payments. | `num_late_payments / num_invoices` |
| **Avg Days Late** | 20% | Average delay for late payments. | `min(avg_days_late, 90) / 90` (Capped at 90 days) |
| **Max Days Late** | 10% | Worst-case payment delay. | `min(max_days_late, 120) / 120` (Capped at 120 days) |
| **% Invoices > 90+** | 20% | Proportion of invoices in the 90+ days ageing bucket. | `percent_90_plus / 100` |
| **Credit Terms** | 5% | Risk associated with credit terms length. | < 14 days: 1.0 (High)<br>14-30 days: 0.5 (Med)<br>> 30 days: 0.0 (Low) |
| **Days Since Last Payment** | 5% | Recency of payment activity. | `min(days_since_last, 60) / 60` (Capped at 60 days) |
| **Outstanding / Total Billed** | 10% | Current debt ratio relative to annual billing. | `min(outstanding / billed_last_12m, 1.0)` |

## Calculation Example

**Customer: Acme Corp**

- **History**:
    - 10 Invoices total
    - 3 Late payments
    - Avg days late: 15 days
    - Max days late: 45 days
    - 1 Invoice in 90+ bucket (10%)
    - Credit Terms: 30 days
    - Last Payment: 10 days ago
    - Total Outstanding: $1,000
    - Total Billed (12m): $10,000

**Scoring**:

1.  **Late Payment Rate**: 3 / 10 = **0.30**
    - Weighted: 0.30 * 0.30 = **0.09**
2.  **Avg Days Late**: 15 / 90 = **0.167**
    - Weighted: 0.167 * 0.20 = **0.033**
3.  **Max Days Late**: 45 / 120 = **0.375**
    - Weighted: 0.375 * 0.10 = **0.038**
4.  **% Invoices > 90+**: 10% = **0.10**
    - Weighted: 0.10 * 0.20 = **0.02**
5.  **Credit Terms**: 30 days = **0.50** (Medium)
    - Weighted: 0.50 * 0.05 = **0.025**
6.  **Days Since Last Payment**: 10 / 60 = **0.167**
    - Weighted: 0.167 * 0.05 = **0.008**
7.  **Outstanding Ratio**: 1000 / 10000 = **0.10**
    - Weighted: 0.10 * 0.10 = **0.01**

**Total Risk Score**: 0.09 + 0.033 + 0.038 + 0.02 + 0.025 + 0.008 + 0.01 = **0.224**

**Final Score: 0.22** (Low-Medium Risk)
