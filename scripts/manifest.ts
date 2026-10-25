// Types and helpers for the Custom Elements Manifest (dist/custom-elements.json),
// shared by the build scripts and the docs site's API tables.

export interface Type {
  text: string
}
export interface Parameter {
  name: string
  type?: Type
  optional?: boolean
  default?: string
  description?: string
}
export interface Member {
  kind: "field" | "method"
  name: string
  static?: boolean
  privacy?: string
  readonly?: boolean
  type?: Type
  description?: string
  parameters?: Parameter[]
  return?: { type?: Type }
}
export interface Named {
  name: string
  description?: string
  type?: Type
  default?: string
}
export interface Declaration {
  kind: "class" | "function" | "variable" | "mixin"
  name: string
  description?: string
  tagName?: string
  customElement?: boolean
  members?: Member[]
  attributes?: Named[]
  events?: Named[]
  slots?: Named[]
  cssParts?: Named[]
  cssStates?: Named[]
  cssProperties?: Named[]
  parameters?: Parameter[]
  return?: { type?: Type }
  type?: Type
}
export interface Module {
  path: string
  declarations?: Declaration[]
  exports?: {
    kind: string
    name: string
    declaration?: { name: string; module?: string }
  }[]
}
export interface Manifest {
  modules: Module[]
}

/** Every custom element in the manifest, with the module that defines it. */
export function customElements(
  manifest: Manifest
): { declaration: Declaration; module: Module }[] {
  return manifest.modules
    .flatMap((module) =>
      (module.declarations ?? [])
        .filter((declaration) => declaration.customElement)
        .map((declaration) => ({ declaration, module }))
    )
    .sort((a, b) =>
      (a.declaration.tagName ?? "").localeCompare(b.declaration.tagName ?? "")
    )
}

/** Instance fields and methods consumers can use. */
export function publicMembers(declaration: Declaration): Member[] {
  return (declaration.members ?? []).filter(
    (m) => !m.static && m.privacy !== "private" && !m.name.startsWith("#")
  )
}

/** Parameter list for a signature, `?` marking optional ones. */
export function params(list: Parameter[] = [], typed = false): string {
  return list
    .map((p) => {
      const name = `${p.name}${p.optional || p.default ? "?" : ""}`
      return typed && p.type ? `${name}: ${p.type.text}` : name
    })
    .join(", ")
}
