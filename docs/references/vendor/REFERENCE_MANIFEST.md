# Vendor Reference Manifest

Fetched on 2026-06-01. These files are local evidence for product and implementation decisions. Implementers must read the relevant local files before copying a pattern.

| Reference | Source | Commit / Date | Local files | Borrowed capability |
| --- | --- | --- | --- | --- |
| Postiz | https://github.com/gitroomhq/postiz-app | `4ecc0c275c082f32954318955295ae35476f2c23` | `postiz/README.md`, selected frontend/backend files | Social scheduling, content queue, platform integrations, automation-friendly API posture |
| Mixpost | https://github.com/inovector/mixpost | `df57648b866310446703f5294350552b62735df5` | `mixpost/README.md`, selected migrations and components | Calendar, queue management, account management, analytics, post versions |
| MediaCrawler | https://github.com/NanmiCoder/MediaCrawler | `165776886faf56d44651d4dbd290b015582a97f2` | `mediacrawler/README.md` | Chinese-platform collection boundary, Playwright/CDP model, data export caution |
| ALwrity | https://github.com/AJaySi/AI-Writer | `923fa671feb33beb91290529205b21e916bd817c` | `alwrity/backend__README.md`, selected content APIs | Brand brain, content strategy, onboarding, API/service/model separation |
| n8n | https://github.com/n8n-io/n8n | `5de0d32e2dfba3c49e83eeb7d563214bdbff96a4` | `n8n/README.md`, selected runner and workflow docs | Automation executions, triggers, retryable runs, node-like provider boundaries |
| Directus | https://github.com/directus/directus | `4290f6e1f544382ab594cdafa0893b428083a2fc` | `directus/_selected_files.txt`, selected API/database files | Content-management shell, data-first admin model, permissions/audit posture |
| Baserow | https://github.com/bram2w/baserow | `8d41ae1e5743ae258d33f334b0a1dc493ada9e1c` | `baserow/README.md`, `baserow/docs__index.md` | Table-centric data management and no-code database mental model |
| Metabase | https://github.com/metabase/metabase | `102682e36f06008b67bc3a7301ab248881febc66` | `metabase/README.md`, selected docs | KPI cards, dashboards, filters, question-driven analytics |
| Evidence | https://github.com/evidence-dev/evidence | `bdf2ce10040f81dbfcd43acde438052cc25b8e5c` | `evidence/README.md`, `evidence/docs__index.md` | Markdown reports with embedded data, weekly/monthly review style |
| OpenAI Harness Engineering | https://openai.com/index/harness-engineering/ | fetched 2026-06-01 | `openai-harness/harness-engineering.html` | Agent-readable repo, observability, garbage collection, durable context |
| GitHub Spec Kit | https://github.github.com/spec-kit/index.html | fetched 2026-06-01 | `github-spec-kit/spec-kit.html` | Spec -> plan -> tasks -> implementation flow |
| Anthropic Building Effective Agents | https://www.anthropic.com/research/building-effective-agents | fetched 2026-06-01 | `anthropic-agents/building-effective-agents.html` | Workflow-first agent patterns, routing, evaluator-optimizer, human-in-loop |
| Google ADK Eval | https://adk.dev/evaluate/ | fetched 2026-06-01 | `google-adk-eval/evaluate.html` | Evaluation and trajectory-style quality thinking |
| MCP | https://modelcontextprotocol.io/specification/latest | fetched 2026-06-01 | `mcp/specification.html` | Connector protocol mindset and tool boundary discipline |
| Azure AI Well-Architected | https://learn.microsoft.com/en-us/azure/well-architected/ai/design-principles | fetched 2026-06-01 | `azure-ai-well-architected/design-principles.html` | Reliability, safety, operations, cost, performance quality lens |

## Local Reading Rule

- UI shell work reads Directus/Baserow local files first.
- Publishing queue work reads Postiz/Mixpost local files first.
- Collection/provider work reads MediaCrawler/n8n local files first.
- Content strategy work reads ALwrity local files first.
- Dashboard/report work reads Metabase/Evidence local files first.
- Governance and Agent work reads OpenAI Harness, Spec Kit, Anthropic, Google ADK, MCP, and Azure local files first.
