// Generates the agent skill in skills/surface-elements/ from the Custom
// Elements Manifest (dist/custom-elements.json), the package exports and the
// docs site pages. Run after `cem analyze`; CI fails if the output drifts.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import {
  params,
  publicMembers,
  type Declaration,
  type Manifest,
  type Module,
} from "./manifest.ts"

const PACKAGE = "surface-elements"
const DOCS = "site/src/content/docs"
const OUT = `skills/${PACKAGE}`
// Pages already covered by SKILL.md itself.
const SKIP_PAGES = new Set(["index", "getting-started"])

interface Page {
  slug: string
  title: string
  description: string
  body: string
}

const manifest: Manifest = JSON.parse(
  readFileSync("dist/custom-elements.json", "utf8")
)
// The analyzer does not emit modules in a stable order.
manifest.modules.sort((a, b) => a.path.localeCompare(b.path))
const pkg = JSON.parse(readFileSync("package.json", "utf8"))

// Public entry points: package export "./x" maps to source module src/x/x.ts.
const entries = Object.entries<string | { types?: string }>(pkg.exports)
  .filter(([key]) => key !== "./package.json")
  .map(([key, value]) => {
    const specifier = key === "." ? PACKAGE : `${PACKAGE}/${key.slice(2)}`
    const types = typeof value === "string" ? undefined : value.types
    const source = types
      ?.replace(/^\.\/dist\//, "src/")
      .replace(/\.d\.ts$/, ".ts")
    return { key, specifier, source }
  })

// Declarations only the root entry re-exports, keyed by their source module.
const root = manifest.modules.find(
  (mod) => mod.path === entries.find((e) => e.key === ".")?.source
)
const rootExports = new Map<string, Set<string>>()
for (const e of root?.exports ?? []) {
  const from = e.declaration?.module
  if (!from) continue
  const path = join(dirname(root!.path), from).replace(/\.js$/, ".ts")
  rootExports.set(path, (rootExports.get(path) ?? new Set()).add(e.name))
}

const pages = readPages(DOCS)
const pageBySlug = new Map(pages.map((page) => [page.slug, page]))

// Group public modules by their folder under src/, which matches the slug of
// their docs page (src/drawer/ ↔ components/drawer.mdx).
const modulesBySlug = new Map<string, Module[]>()
for (const mod of manifest.modules) {
  const slug = basename(dirname(mod.path))
  if (slug === "src" || publicDeclarations(mod).length === 0) continue
  modulesBySlug.set(slug, [...(modulesBySlug.get(slug) ?? []), mod])
}

const slugs = [
  ...new Set([
    ...pages.map((page) => page.slug),
    ...modulesBySlug.keys(),
  ]),
].filter((slug) => !SKIP_PAGES.has(slug))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(`${OUT}/references`, { recursive: true })

for (const slug of slugs) {
  const page = pageBySlug.get(slug)
  const modules = modulesBySlug.get(slug) ?? []
  const parts = [`# ${page?.title ?? slug}`]
  if (page?.description) parts.push(page.description)
  if (page?.body) parts.push(page.body)
  if (modules.length > 0) {
    parts.push("## API reference (generated from source)")
    parts.push(...modules.flatMap(renderModule))
  }
  writeFileSync(`${OUT}/references/${slug}.md`, tidy(parts.join("\n\n")))
}

const elements = manifest.modules
  .flatMap((mod) => publicDeclarations(mod))
  .filter((decl) => decl.customElement && decl.tagName)
const functions = manifest.modules
  .flatMap((mod) => publicDeclarations(mod))
  .filter((decl) => decl.kind === "function")

const description = [
  `Use when writing HTML, CSS or JavaScript with the ${PACKAGE} package`,
  `(${elements.map((el) => `<${el.tagName}>`).join(", ")}`,
  `and ${functions.map((fn) => `${fn.name}()`).join(", ")}).`,
  "Covers imports, markup, attributes, methods, styling hooks, accessibility",
  "and browser fallbacks for native dialogs and drawers.",
].join(" ")

const skill = readFileSync("scripts/skill-template.md", "utf8")
  .replace("{{description}}", description)
  .replace("{{entryPoints}}", renderEntryPoints())
  .replace("{{elements}}", renderElementsSummary())
  .replace("{{references}}", renderReferenceIndex())

writeFileSync(`${OUT}/SKILL.md`, tidy(skill))

function renderEntryPoints(): string {
  const rows = entries.map(({ key, specifier, source }) => {
    const mod = manifest.modules.find((m) => m.path === source)
    const declarations = mod ? publicDeclarations(mod) : []
    const tags = declarations
      .filter((decl) => decl.tagName)
      .map((decl) => `\`<${decl.tagName}>\` (registers itself on import)`)
    const names = declarations
      .filter((decl) => !decl.tagName)
      .map((decl) => `\`${decl.name}\``)
    let contains = [...tags, ...names].join(", ")
    if (key === ".") contains = "Everything below."
    else if (key.endsWith(".css")) contains = "Stylesheet for CSS-only use."
    return [`\`${specifier}\``, contains]
  })
  return table(["Import", "Contains"], rows)
}

function renderElementsSummary(): string {
  if (elements.length === 0) return ""
  const rows = elements.map((el) => [
    `\`<${el.tagName}>\``,
    firstSentence(el.description),
    `[${el.tagName}.md](references/${referenceFor(el)}.md)`,
  ])
  return `## Elements\n\n${table(["Element", "What it is", "Reference"], rows)}`
}

function renderReferenceIndex(): string {
  return slugs
    .map((slug) => {
      const page = pageBySlug.get(slug)
      const summary = page?.description ?? `API of \`${PACKAGE}/${slug}\`.`
      return `- [references/${slug}.md](references/${slug}.md): ${summary}`
    })
    .join("\n")
}

function referenceFor(decl: Declaration): string {
  for (const [slug, modules] of modulesBySlug) {
    if (modules.some((mod) => mod.declarations?.includes(decl))) return slug
  }
  return ""
}

// What consumers can import: everything a package entry exports, plus what
// the root entry re-exports from modules that have no entry of their own.
function publicDeclarations(mod: Module): Declaration[] {
  const exported = entries.some((e) => e.source === mod.path)
    ? new Set(mod.exports?.map((e) => e.name))
    : (rootExports.get(mod.path) ?? new Set())
  return (mod.declarations ?? []).filter((decl) => exported.has(decl.name))
}

function renderModule(mod: Module): string[] {
  const entry = entries.find((e) => e.source === mod.path)
  return publicDeclarations(mod).map((decl) => {
    if (decl.kind === "class") return renderClass(decl, entry?.specifier)
    if (decl.kind === "function") return renderFunction(decl, entry?.specifier)
    return renderVariable(decl, entry?.specifier)
  })
}

function renderClass(decl: Declaration, specifier = PACKAGE): string {
  const title = decl.tagName
    ? `### \`<${decl.tagName}>\` (\`${decl.name}\`)`
    : `### \`${decl.name}\``
  const out = [title]
  if (decl.description) out.push(decl.description)
  out.push(
    "```js\n" +
      (decl.tagName
        ? `import "${specifier}"`
        : `import { ${decl.name} } from "${specifier}"`) +
      "\n```"
  )

  const members = publicMembers(decl)
  const fields = members.filter((m) => m.kind === "field")
  const methods = members.filter((m) => m.kind === "method")

  if (decl.attributes?.length) {
    out.push(
      "#### Attributes",
      table(
        ["Attribute", "Type", "Description"],
        decl.attributes.map((a) => [
          `\`${a.name}\``,
          code(a.type?.text),
          a.description ?? "",
        ])
      )
    )
  }
  if (fields.length > 0) {
    out.push(
      "#### Properties",
      table(
        ["Property", "Type", "Description"],
        fields.map((f) => [
          `\`${f.name}\``,
          code(f.type?.text) + (f.readonly ? ", read-only" : ""),
          f.description ?? "",
        ])
      )
    )
  }
  if (methods.length > 0) {
    out.push(
      "#### Methods",
      table(
        ["Method", "Returns", "Description"],
        methods.map((m) => [
          `\`${m.name}(${params(m.parameters)})\``,
          code(m.return?.type?.text ?? "void"),
          m.description ?? "",
        ])
      )
    )
  }
  if (decl.events?.length) {
    out.push(
      "#### Events",
      table(
        ["Event", "Type", "Description"],
        decl.events.map((e) => [
          `\`${e.name}\``,
          code(e.type?.text),
          e.description ?? "",
        ])
      )
    )
  }
  if (decl.slots?.length) {
    out.push(
      "#### Slots",
      table(
        ["Slot", "Description"],
        decl.slots.map((s) => [
          s.name ? `\`${s.name}\`` : "(default)",
          s.description ?? "",
        ])
      )
    )
  }
  if (decl.cssStates?.length) {
    out.push(
      "#### CSS states",
      table(
        ["Selector", "Description"],
        decl.cssStates.map((s) => [
          `\`${decl.tagName ?? ""}:state(${s.name})\``,
          s.description ?? "",
        ])
      )
    )
  }
  if (decl.cssParts?.length) {
    out.push(
      "#### CSS parts",
      table(
        ["Part", "Description"],
        decl.cssParts.map((p) => [`\`::part(${p.name})\``, p.description ?? ""])
      )
    )
  }
  if (decl.cssProperties?.length) {
    out.push(
      "#### CSS custom properties",
      table(
        ["Property", "Default", "Description"],
        decl.cssProperties.map((p) => [
          `\`${p.name}\``,
          code(p.default),
          p.description ?? "",
        ])
      )
    )
  }
  return out.join("\n\n")
}

function renderFunction(decl: Declaration, specifier = PACKAGE): string {
  const signature = `function ${decl.name}(${params(decl.parameters, true)}): ${
    decl.return?.type?.text ?? "void"
  }`
  const out = [`### \`${decl.name}()\``]
  if (decl.description) out.push(decl.description)
  out.push(
    "```ts\n" +
      `import { ${decl.name} } from "${specifier}"\n\n${signature}` +
      "\n```"
  )
  return out.join("\n\n")
}

function renderVariable(decl: Declaration, specifier = PACKAGE): string {
  const out = [`### \`${decl.name}\``]
  if (decl.description) out.push(decl.description)
  out.push(
    "```ts\n" +
      `import { ${decl.name} } from "${specifier}"` +
      (decl.type?.text ? `\n\nconst ${decl.name}: ${decl.type.text}` : "") +
      "\n```"
  )
  return out.join("\n\n")
}

function code(text?: string): string {
  return text ? `\`${text}\`` : ""
}

function table(head: string[], rows: string[][]): string {
  const cell = (value: string) =>
    value.replace(/\|/g, "\\|").replace(/\n+/g, " ")
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n")
}

function firstSentence(text = ""): string {
  return text.split(/(?<=\.)\s/)[0] ?? ""
}

function tidy(markdown: string): string {
  return (
    markdown
      .replace(/\n{3,}/g, "\n\n")
      // Drop headings left empty once their demo is gone.
      .replace(/^(#+) .*\n+(?=(#+) )/gm, (heading, own: string, next: string) =>
        next.length <= own.length ? "" : heading
      )
      .trim() + "\n"
  )
}

function readPages(root: string): Page[] {
  return walk(root)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => {
      const source = readFileSync(file, "utf8")
      const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
      const frontmatter = match?.[1] ?? ""
      const field = (name: string) =>
        new RegExp(`^${name}:\\s*(.+)$`, "m")
          .exec(frontmatter)?.[1]
          ?.trim()
          .replace(/^["']|["']$/g, "") ?? ""
      return {
        slug: basename(file).replace(/\.mdx?$/, ""),
        title: field("title"),
        description: field("description"),
        body: mdxToMarkdown(source.slice(match?.[0].length ?? 0)),
      }
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

// Turns a Starlight page into plain Markdown: live demos and layout
// components go, asides become blockquotes, tabs become labelled blocks and
// site links point at the sibling reference files.
function mdxToMarkdown(mdx: string): string {
  const asideTitles: Record<string, string> = {
    note: "Note",
    tip: "Tip",
    caution: "Caution",
    danger: "Danger",
  }
  return (
    mdx
      .replace(/^(?:\s*import\s[\s\S]*?\sfrom\s+["'][^"']+["'];?)+/, "")
      .replace(/<Demo\b[\s\S]*?<\/Demo>/g, "")
      .replace(
        /<CopyFile\s+([^>]*?)\/>/g,
        (_, attrs: string) =>
          `The copy file is \`copy/${attr(attrs, "tag")}.js\` in the repository: the whole web component in one ES module, with its styles and dependencies inlined. Load it with \`<script type="module" src="/${attr(attrs, "tag")}.js"></script>\`.`
      )
      .replace(/<ApiReference\s+([^>]*?)\/>/g, (_, attrs: string) => {
        const tag = attr(attrs, "tag")
        return `See the \`<${tag}>\` tables under "API reference (generated from source)" in [${slugForTag(tag)}.md](${slugForTag(tag)}.md).`
      })
      .replace(/<\/?(?:CardGrid|Tabs)\b[^>]*>/g, "")
      .replace(
        /<LinkCard\s+([\s\S]*?)\/>/g,
        (_, attrs: string) =>
          `- [${attr(attrs, "title")}](${attr(attrs, "href")}): ${attr(attrs, "description")}`
      )
      .replace(
        /<Card\s+([^>]*)>([\s\S]*?)<\/Card>/g,
        (_, attrs: string, body: string) =>
          `**${attr(attrs, "title")}.** ${dedent(body)}`
      )
      .replace(
        /^[ \t]*<TabItem\s+([^>]*)>([\s\S]*?)<\/TabItem>/gm,
        (_, attrs: string, body: string) =>
          `\n${attr(attrs, "label")}:\n\n${dedent(body)}\n`
      )
      .replace(
        /<Aside\b([^>]*)>([\s\S]*?)<\/Aside>/g,
        (_, attrs: string, body: string) => {
          const title =
            attr(attrs, "title") ||
            asideTitles[attr(attrs, "type") || "note"] ||
            "Note"
          const text = dedent(body).replace(/\n(?!\n)/g, " ")
          return `> **${title}:** ${text.replace(/\n\n/g, "\n>\n> ")}`
        }
      )
      // Formatters collapse fenced code inside JSX to one line.
      .replace(/```(\w+) (.+?) ```/g, "```$1\n$2\n```")
      .replace(
        /\]\(\/(?:[\w-]+\/)*([\w-]+)\/(#[\w-]+)?\)/g,
        (_, slug: string, hash = "") =>
          SKIP_PAGES.has(slug) ? `](../SKILL.md${hash})` : `](${slug}.md${hash})`
      )
  )
}

// Folder under src/ of the module that defines a tag, which is also the slug
// of its reference file.
function slugForTag(tag: string): string {
  const mod = manifest.modules.find((m) =>
    m.declarations?.some((decl) => decl.tagName === tag)
  )
  return mod ? basename(dirname(mod.path)) : tag
}

function attr(attrs: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? ""
}

function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, "").split("\n")
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length)
  )
  return lines.map((l) => l.slice(indent)).join("\n")
}
