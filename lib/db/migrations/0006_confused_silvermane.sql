CREATE INDEX "regulatory_document_country_idx" ON "RegulatoryDocument" USING btree ("country");--> statement-breakpoint
CREATE INDEX "regulatory_document_category_idx" ON "RegulatoryDocument" USING btree ("category");--> statement-breakpoint
CREATE INDEX "regulatory_document_status_idx" ON "RegulatoryDocument" USING btree ("status");--> statement-breakpoint
CREATE INDEX "regulatory_document_source_url_idx" ON "RegulatoryDocument" USING btree ("sourceUrl");--> statement-breakpoint
CREATE INDEX "regulatory_scrape_job_status_idx" ON "RegulatoryScrapeJob" USING btree ("status");--> statement-breakpoint
CREATE INDEX "regulatory_scrape_job_country_idx" ON "RegulatoryScrapeJob" USING btree ("country");--> statement-breakpoint
CREATE INDEX "regulatory_scrape_job_created_at_idx" ON "RegulatoryScrapeJob" USING btree ("createdAt");