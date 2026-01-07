/**
 * @typedef {object} ElementMissingOptions
 * @prop {boolean} [shadowRoot] Optional, specify if element should exist in ```ShadowRoot```
 *
 * @typedef {typeof prefix} CustomElementPrefix
 */

import removeWhitespace from './scripts/html.js'

const baseTemplates = /** @type {const} */ (['elements', 'modals', 'routes', 'svgs'])
const prefix = /** @type {const} */ ('s')

/**
 * @param {Parameters<typeof String.raw>[0]['raw']} strings
 * @param {...Parameters<typeof String.raw>[1]} values
 */
export function css (strings, ...values) {
  const rawStyles = String.raw({ raw: strings }, ...values)

  const styleSheet = new CSSStyleSheet()
  styleSheet.replaceSync(rawStyles)

  return styleSheet
}

/**
 * @param {string} suffix
 * @param {CustomElementConstructor} constructor
 */
export function define (suffix, constructor) {
  const name = `${prefix}-${suffix}`

  if (!customElements.get(name)) customElements.define(name, constructor)
}

/**
 * Returns a generic error message for use in an ```Error``` object
 *
 * @overload
 * @param {ElementMissingOptions & { selectors: keyof HTMLElementTagNameMap }} options
 * @returns {string}
 */

/**
 * @overload
 * @param {ElementMissingOptions & { selectors: string }} options
 * @returns {string}
 */

/** @param {ElementMissingOptions & { selectors: keyof HTMLElementTagNameMap | string }} options */
export function elementMissing ({ selectors, shadowRoot }) {
  return `Please specify a ${shadowRoot ? 'shadow root ' : ''}child ${selectors}`
}

/**
 * @param {Parameters<typeof String.raw>[0]['raw']} strings
 * @param {...Parameters<typeof String.raw>[1]} values
 */
export function html (strings, ...values) {
  const rawHTML = String.raw({ raw: strings }, ...values)

  const template = document.createElement('template')
  template.innerHTML = rawHTML

  removeWhitespace(template.content.childNodes)
  return template
}

/**
 * Retrieves a **base** ```HTMLTemplateElement``` that exists in ```head```
 *
 * Throws if ```HTMLTemplateElement``` is not found
 * @param {typeof baseTemplates[number]} id
 * @returns {HTMLTemplateElement | never}
 */
export function template (id) {
  if (!baseTemplates.includes(id)) throw new Error(`#${id} is not a base template${import.meta.env.DEV ? `\n\nA base template must be specified in document head with one of the following id attributes:\n${baseTemplates.map((each) => `template#${each}`).join(', ')}\n` : ''}`)

  const template = /** @type {HTMLTemplateElement | null} */ (document.getElementById(id))
  if (!(template instanceof HTMLTemplateElement)) throw new Error(`${elementMissing({ selectors: `template#${id}` })} in document head`)

  return template
}
