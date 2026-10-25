import { afterEach, describe, expect, it } from "vitest"

import { lockScroll } from "./scroll-lock.js"

describe("lockScroll in a real browser", () => {
  afterEach(() => {
    document.body.replaceChildren()
    window.scrollTo(0, 0)
  })

  it("keeps sticky elements stuck while the page is scrolled", () => {
    const bar = document.createElement("div")
    bar.style.cssText = "position: sticky; top: 0; height: 2rem"
    const filler = document.createElement("div")
    filler.style.height = "300vh"
    document.body.append(bar, filler)
    window.scrollTo(0, 500)

    const release = lockScroll()
    const top = bar.getBoundingClientRect().top
    release()

    expect(top).toBe(0)
    expect(window.scrollY).toBe(500)
  })
})
