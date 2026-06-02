# PREVIEW-001: Import Preview and Confirm Save

## Goal

Let users preview parsed import rows before saving them into SQLite.

## Acceptance

- Preview parses the same providers as import.
- Preview reports content, metric, idea counts, duplicate content IDs, warnings, and sample rows.
- Preview may write logs but must not create `ImportRun` or save imported entities.
- Confirm save uses the existing import path.
