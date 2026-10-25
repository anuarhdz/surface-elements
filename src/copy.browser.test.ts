import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

// The generated copy files, loaded before anything from src/ defines the tags.
import "../copy/surface-accordion.js"
import "../copy/surface-drawer.js"
import "../copy/surface-header.js"

import type { SurfaceDrawer } from "./drawer/drawer.js"
import { isScrollLocked, lockScroll } from "./scroll-lock/scroll-lock.js"

// The lock follows the dialog's open attribute through a MutationObserver.
const flush = () => new Promise((resolve) => setTimeout(resolve))

describe("copy files", () => {
  afterEach(() => fixtureCleanup())

  it("define their web components on their own", () => {
    expect(customElements.get("surface-accordion")).toBeDefined()
    expect(customElements.get("surface-drawer")).toBeDefined()
    expect(customElements.get("surface-header")).toBeDefined()
  })

  it("share the scroll lock count with the package", async () => {
    const el = await fixture<SurfaceDrawer>(
      html`<surface-drawer><dialog></dialog></surface-drawer>`
    )

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)

    const release = lockScroll()
    await el.close()
    await flush()
    expect(document.documentElement.style.overflow).toBe("hidden")

    release()
    expect(isScrollLocked()).toBe(false)
  })
})
