# CONNECTOR-001: Local Connector Imports

## Goal

Support platform CSV presets, MediaCrawler JSON, and n8n execution JSON as local import sources.

## Acceptance

- External formats only enter through Providers.
- Every connector returns `ProviderImportPayload`.
- Failed imports create failed `ImportRun` and structured logs.
- `npm run test:self-media` covers CSV presets, MediaCrawler, and n8n.

## References Read Locally

- `docs/references/vendor/mediacrawler/README.md`
- `docs/references/vendor/n8n/_selected_files.txt`
- `docs/references/vendor/postiz/_selected_files.txt`
- `docs/references/vendor/mixpost/_selected_files.txt`
