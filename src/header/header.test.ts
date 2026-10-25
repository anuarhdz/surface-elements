import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { SurfaceHeader } from "./header.js"

const header = (attrs = "") =>
  fixture<SurfaceHeader>(
    attrs
      ? html`<surface-header hide-on-scroll
          ><header>Hi</header></surface-header
        >`
      : html`<surface-header><header>Hi</header></surface-header>`
  )

describe("surface-header", () => {
  afterEach(() => fixtureCleanup())

  it("registers the custom element", () => {
    expect(customElements.get(SurfaceHeader.tagName)).toBe(SurfaceHeader)
  })

  it("adopts the header styles", async () => {
    await header()
    expect(
      document.querySelector('style[data-surface-elements="header"]')
    ).not.toBeNull()
  })

  it("is not stuck before the page scrolls", async () => {
    const el = await header()

    expect(el.stuck).toBe(false)
  })

  it("publishes its height on the scroll container and removes it on disconnect", async () => {
    const el = await header()
    const root = document.documentElement

    expect(root.style.getPropertyValue("--surface-header-height")).toBe("0px")

    el.remove()
    expect(root.style.getPropertyValue("--surface-header-height")).toBe("")
  })

  it("keeps the native header as its child", async () => {
    const el = await header("hide-on-scroll")

    expect(el.querySelector(":scope > header")).not.toBeNull()
  })
})
