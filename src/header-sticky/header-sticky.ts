import { defineElement } from "../utils/define.js"

export class HeaderSticky extends HTMLElement {
  static readonly tagName = "header-sticky"
}

defineElement(HeaderSticky.tagName, HeaderSticky)

declare global {
  interface HTMLElementTagNameMap {
    "header-sticky": HeaderSticky
  }
}
