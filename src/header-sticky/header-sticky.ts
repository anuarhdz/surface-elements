import { defineElement } from "../utils/define.js"

/**
 * A page header that sticks to the top. Early: it only registers the element
 * and ships no styles or behavior yet, so the sticking comes from your CSS.
 *
 * @tag header-sticky
 * @slot - The header content.
 */
export class HeaderSticky extends HTMLElement {
  static readonly tagName = "header-sticky"
}

defineElement(HeaderSticky.tagName, HeaderSticky)

declare global {
  interface HTMLElementTagNameMap {
    "header-sticky": HeaderSticky
  }
}
