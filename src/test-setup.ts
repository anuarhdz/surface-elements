// jsdom lacks the modal half of HTMLDialogElement. Emulate just enough of it.
const modals = new WeakSet<Element>()
const proto = HTMLDialogElement.prototype

if (!("returnValue" in proto)) {
  const values = new WeakMap<HTMLDialogElement, string>()
  Object.defineProperty(proto, "returnValue", {
    get(this: HTMLDialogElement) {
      return values.get(this) ?? ""
    },
    set(this: HTMLDialogElement, value: string) {
      values.set(this, String(value))
    },
  })
}

proto.showModal = function (this: HTMLDialogElement) {
  if (this.open) return
  modals.add(this)
  this.setAttribute("open", "")
}

proto.close = function (this: HTMLDialogElement, returnValue?: string) {
  if (!this.open) return

  if (returnValue !== undefined) this.returnValue = returnValue
  modals.delete(this)
  this.removeAttribute("open")
  this.dispatchEvent(new Event("close"))
}

const matches = Element.prototype.matches

// SAFETY: the tag-name overloads only narrow on the boolean, which this
// override returns unchanged from the native method for every other selector.
Element.prototype.matches = function (this: Element, selectors: string) {
  if (selectors === ":modal")
    return modals.has(this) && this.hasAttribute("open")

  return matches.call(this, selectors)
} as typeof matches
