export default class CustomElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = []

  // TODO: using this in modal now
  connected = false
  /** @type {(() => void)[]} */
  disconnectedCallbacks = []

  /**
   * @param {string} _name
   * @param {string | null} _oldValue
   * @param {string | null} _newValue
   */
  attributeChangedCallback (_name, _oldValue, _newValue) {}

  connectedCallback () {}

  disconnectedCallback () {
    while (this.disconnectedCallbacks.length) {
      this.disconnectedCallbacks.shift()?.()
    }
  }

  /**
   * @template {keyof HTMLElementEventMap} T
   * @param {T} type
   * @param {HTMLElementEventMap[T] extends CustomEvent<infer Detail> ? CustomEventInit<Detail> : EventInit} [eventInitDict]
   */
  dispatch (type, eventInitDict) {
    return this.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable: true, composed: true, ...eventInitDict }))
  }
}
