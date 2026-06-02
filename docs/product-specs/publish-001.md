# PUBLISH-001: Publish Queue State Machine

## Goal

Make the publish queue behave like a lightweight Postiz/Mixpost-style scheduler without connecting live platform APIs.

## State Machine

`draft -> needs_review -> queued -> scheduled -> publishing -> published`

Failure and intervention states:

- `publishing -> failed`
- `needs_review | queued | scheduled -> blocked`
- `failed | blocked -> needs_review`

## Acceptance

- UI can advance legal queue states through API.
- Service rejects illegal jumps.
- Queue transitions are logged with trace IDs.
- `npm run test:self-media` covers legal and illegal transitions.
