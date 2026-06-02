# Credential Handling

## Rules

- Real platform keys, tokens, cookies, AppSecret values, and OAuth refresh tokens must only live in `.env.local` or another ignored local secret store.
- `.env.local` is ignored by Git through `.gitignore`.
- `.env.example` is the only environment file allowed in Git, and it must contain placeholders only.
- If a secret is pasted into chat, screenshots, logs, or docs, treat it as exposed and rotate it before real API use.
- Never write platform cookies or browser session tokens into docs, tests, screenshots, or Git commits.

## Current Local Keys

- WeChat Official Account uses `WECHAT_OFFICIAL_ACCOUNT_ID`, `WECHAT_APP_ID`, `WECHAT_APP_SECRET`, and `WECHAT_API_IP_ALLOWLIST`.
- The local allowlist candidate is the current machine/proxy public IP; update it if the network changes.

## Checks

- `git check-ignore -v .env.local`
- `rg -n "APP_SECRET|AppSecret|refresh_token|access_token" .`
- `npm run check:wechat` checks the current public IP and WeChat token connectivity without printing secrets.
