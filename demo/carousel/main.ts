import "../../src/carousel/carousel.js"

import type { SurfaceCarousel } from "../../src/carousel/carousel.js"
import { hud } from "../shared/hud.js"

const slider = document.querySelector<SurfaceCarousel>("#slider")

slider?.track?.append(
  ...Array.from({ length: 8 }, (_, i) => {
    const slide = document.createElement("div")
    slide.className = "slide"
    slide.style.setProperty("--hue", String(i * 45))
    slide.innerHTML = `<span>${i + 1}</span>`

    return slide
  })
)

const carousels = [...document.querySelectorAll<SurfaceCarousel>("surface-carousel")]
let last = "-"

document.addEventListener("surface-carousel-change", (event) => {
  last = `#${(event.target as Element).id} → ${event.detail.index}`
})

hud(() => ({
  ...Object.fromEntries(
    carousels.map((el) => [
      `#${el.id}`,
      `${el.index + 1}/${el.slides.length}${el.playing ? " ▶" : ""}`,
    ])
  ),
  "last change": last,
  "reduced motion": matchMedia("(prefers-reduced-motion: reduce)").matches,
}))
