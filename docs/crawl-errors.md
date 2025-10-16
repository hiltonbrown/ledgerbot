# Crawl Errors

The `firecrawl_crawl` tool failed with a schema error for all GitHub repository URLs. As a workaround, `firecrawl_scrape` was used to fetch the content of the main page of the repositories, which in the case of GitHub is the README.md file.

This means that only the README.md files from the following repositories were extracted:

- https://github.com/XeroAPI/xero-node
- https://github.com/XeroAPI/xero-mcp-server
- https://github.com/XeroAPI/xero-agent-toolkit

Other documentation files from these repositories, such as those in `/docs` folders or other markdown files, were not crawled.
