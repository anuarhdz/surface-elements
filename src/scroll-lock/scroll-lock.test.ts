import { afterEach, describe, expect, it } from "vitest"

import { isScrollLocked, lockScroll } from "./scroll-lock.js"

const html = document.documentElement
const body = document.body

describe("lockScroll", () => {
  afterEach(() => {
    html.removeAttribute("style")
    body.removeAttribute("style")
  })

  it("hides overflow on html and body", () => {
    const release = lockScroll()
    expect(html.style.overflow).toBe("hidden")
    expect(body.style.overflow).toBe("hidden")
    expect(isScrollLocked()).toBe(true)

    release()
    expect(html.style.overflow).toBe("")
    expect(body.style.overflow).toBe("")
    expect(isScrollLocked()).toBe(false)
  })

  it("stays locked until every lock is released", () => {
    const first = lockScroll()
    const second = lockScroll()

    first()
    expect(html.style.overflow).toBe("hidden")

    second()
    expect(html.style.overflow).toBe("")
  })

  it("ignores repeated releases of the same lock", () => {
    const first = lockScroll()
    const second = lockScroll()

    first()
    first()
    expect(isScrollLocked()).toBe(true)

    second()
    expect(isScrollLocked()).toBe(false)
  })

  it("restores the inline values it found", () => {
    body.style.overflow = "clip"
    html.style.setProperty("scrollbar-gutter", "auto")

    lockScroll()()

    expect(body.style.overflow).toBe("clip")
    expect(html.style.getPropertyValue("scrollbar-gutter")).toBe("auto")
  })
})
