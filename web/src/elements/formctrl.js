import { elementMissing } from '../index.js'
import CustomElement from './custom.js'

export default class FormControlElement extends CustomElement {
  /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null} */
  control = null
  /** @type {HTMLSpanElement | null} */
  errorSpan = null
  /** @type {HTMLLabelElement | null} */
  label = null

  connectedCallback () {
    this.control = this.querySelector('input, select, textarea')
    if (!this.control) throw new Error(elementMissing({ selectors: 'input, select, textarea' }))

    this.control.addEventListener('input', this.#setInvalid.bind(this))
    this.control.addEventListener('invalid', this.#setInvalid.bind(this))
  }

  #setInvalid () {
    if (this.control?.validationMessage) {
      this.dataset.invalid = ''

      if (this.errorSpan) this.errorSpan.textContent = this.control.validationMessage
    } else {
      this.removeAttribute('data-invalid')

      if (this.errorSpan) this.errorSpan.textContent = null
    }
  }
}
