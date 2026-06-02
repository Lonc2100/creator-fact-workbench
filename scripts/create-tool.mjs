import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--dry-run") args.dryRun = true;
    else if (item === "--name") args.name = argv[++index];
    else if (item === "--label") args.label = argv[++index];
    else throw new Error(`Unknown argument: ${item}`);
  }
  return args;
}

function assertValidName(name) {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Tool name must be kebab-case.");
}

function pascalCase(name) {
  return name.split("-").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join("");
}

function file(relativePath, content) {
  return { relativePath, content: content.endsWith("\n") ? content : `${content}\n` };
}

function buildFiles(name, label) {
  const typeName = pascalCase(name);
  return [
    file(`src/domain/${name}/types/${name}-types.ts`, `export type ${typeName}Status = "draft" | "ready";\n\nexport interface ${typeName}Record {\n  id: string;\n  title: string;\n  status: ${typeName}Status;\n  createdAt: string;\n}\n`),
    file(`src/domain/${name}/types/index.ts`, `export * from "./${name}-types";\n`),
    file(`src/domain/${name}/config/${name}-config.ts`, `import type { ${typeName}Status } from "../types";\n\nexport const DEFAULT_STATUS: ${typeName}Status = "draft";\n`),
    file(`src/domain/${name}/config/index.ts`, `export * from "./${name}-config";\n`),
    file(`src/domain/${name}/repo/memory-${name}-repo.ts`, `import { DEFAULT_STATUS } from "../config";\nimport type { ${typeName}Record } from "../types";\n\nconst records = new Map<string, ${typeName}Record>();\n\nexport function save${typeName}Record(input: Omit<${typeName}Record, "status" | "createdAt">): ${typeName}Record {\n  const record = { ...input, status: DEFAULT_STATUS, createdAt: new Date().toISOString() };\n  records.set(record.id, record);\n  return record;\n}\n`),
    file(`src/domain/${name}/repo/index.ts`, `export * from "./memory-${name}-repo";\n`),
    file(`src/domain/${name}/providers/fake-${name}-provider.ts`, `export class Fake${typeName}Provider {\n  async validateConfig() { return { ok: true, message: "fake provider ready" }; }\n  async dryRun() { return { ok: true, commandPreview: "fake-${name}" }; }\n  async run() { return { title: "${label} demo" }; }\n  async parseResult(raw) { return raw; }\n}\n`),
    file(`src/domain/${name}/providers/index.ts`, `export * from "./fake-${name}-provider";\n`),
    file(`src/domain/${name}/service/${name}-service.ts`, `import { Fake${typeName}Provider } from "../providers";\nimport { save${typeName}Record } from "../repo";\n\nconst provider = new Fake${typeName}Provider();\n\nexport async function createDemo${typeName}() {\n  await provider.validateConfig();\n  await provider.dryRun();\n  const raw = await provider.run();\n  const parsed = await provider.parseResult(raw);\n  return save${typeName}Record({ id: "${name}-demo", title: parsed.title });\n}\n`),
    file(`src/domain/${name}/service/index.ts`, `export * from "./${name}-service";\n`),
    file(`src/domain/${name}/runtime/${name}-runtime.ts`, `import { createDemo${typeName} } from "../service";\n\nexport async function createDemo${typeName}Runtime() {\n  return createDemo${typeName}();\n}\n`),
    file(`src/domain/${name}/runtime/index.ts`, `export * from "./${name}-runtime";\n`),
    file(`src/domain/${name}/ui/screens/${typeName}Page.tsx`, `export default function ${typeName}Page() {\n  return <main className="tool-page"><h1>${label}</h1><p>Generated Harness tool.</p></main>;\n}\n`),
    file(`src/domain/${name}/ui/features/README.md`, `# ${label} Feature UI\n`),
    file(`src/domain/${name}/ui/components/README.md`, `# ${label} Components\n`),
    file(`src/domain/${name}/ui/primitives/README.md`, `# ${label} Primitives\n`),
    file(`src/domain/${name}/ui/index.ts`, `export { default } from "./screens/${typeName}Page";\n`),
    file(`src/app/${name}/page.tsx`, `import ${typeName}Page from "@/domain/${name}/ui";\n\nexport default function Page() {\n  return <${typeName}Page />;\n}\n`),
    file(`src/app/api/${name}/demo/route.ts`, `import { NextResponse } from "next/server";\nimport { createDemo${typeName}Runtime } from "@/domain/${name}/runtime";\n\nexport async function POST() {\n  const record = await createDemo${typeName}Runtime();\n  return NextResponse.json({ record });\n}\n`),
    file(`docs/product-specs/${name}.md`, `# ${label}\n\nGenerated from Harness Tool Template.\n`),
    file(`docs/exec-plans/active/${name}-bootstrap.md`, `# Active Exec Plan: ${label} Bootstrap\n`)
  ];
}

const args = parseArgs(process.argv.slice(2));
assertValidName(args.name);
const label = args.label ?? args.name;
const files = buildFiles(args.name, label);
const existing = files.filter((item) => existsSync(path.join(root, item.relativePath)));

console.log(`Harness tool: ${args.name} (${label})`);
for (const item of files) console.log(`${args.dryRun ? "would write" : "write"} ${item.relativePath}`);
if (args.dryRun) process.exit(0);
if (existing.length > 0) throw new Error(`Refusing to overwrite existing files:\n${existing.map((item) => `- ${item.relativePath}`).join("\n")}`);
for (const item of files) {
  const absolute = path.join(root, item.relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, item.content, "utf8");
}
