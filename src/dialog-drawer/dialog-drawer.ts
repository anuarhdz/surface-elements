import { defineElement } from "../utils/define.js"

export class DialogDrawer extends HTMLElement {
  static readonly tagName = "dialog-drawer"
}

defineElement(DialogDrawer.tagName, DialogDrawer)

declare global {
  interface HTMLElementTagNameMap {
    "dialog-drawer": DialogDrawer
  }
}
