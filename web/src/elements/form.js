import CustomElement from './custom.js'

// TODO: may want to include components extending form in a separate slot after all previous slots. race conditions currently if needed DOM elements constructed through a LATER slotchange event
// TODO: scratch this idea and make the form WRAP it's children and use a setTimeout!
// TODO: when doing this test queueMicrotask as well
export default class FormElement extends CustomElement {
	/** @type {{ [key: string]: FormDataEntryValue }} */
	data = {}
	/** @type {HTMLFieldSetElement | null} */
	fieldset = null
	/** @type {HTMLFormElement | null} */
	form = null
	/** @type {HTMLSpanElement | null} */
	#responseSpan = null

	connectedCallback() {
		this.fieldset = this.closest('fieldset')
		if (!(this.fieldset instanceof HTMLFieldSetElement)) this.#formError()

		this.form = this.fieldset.closest('form')
		if (!(this.form instanceof HTMLFormElement)) this.#formError()

		this.#responseSpan = this.form.querySelector('span[data-response]')
		if (!(this.#responseSpan instanceof HTMLSpanElement)) this.#formError()

		const onSubmit = this.#onSubmit.bind(this)

		this.form.addEventListener('submit', onSubmit)
		this.disconnectedCallbacks.push(() =>
			this.form?.removeEventListener('submit', onSubmit)
		)
	}

	disconnectedCallback() {
		super.disconnectedCallback()

		this.form?.removeAttribute('data-error')
		if (this.#responseSpan) this.#responseSpan.textContent = null
	}

	/** @returns {never} */
	#formError() {
		throw new Error(
			`${this.localName} is nested incorrectly${import.meta.env.DEV ? `\n\n${this.localName} should be nested inside form and fieldset parent elements\n${this.localName} should contain a single span[data-response] element inside the parent form\n\nFor example,\n<form>\n\t<fieldset>\n\t\t...\n\t\t<${this.localName}></${this.localName}>\n\t\t<span data-response></span>\n\t\t...\n\t</fieldset>\n</form>\n` : ''}`
		)
	}

	/** @param {SubmitEvent} event */
	async #onSubmit(event) {
		event.preventDefault()

		if (!this.form?.checkValidity()) {
			const invalid = this.fieldset?.querySelector(':invalid')
			if (invalid instanceof HTMLInputElement) return invalid.focus()

			return
		}

		try {
			this.data = Object.fromEntries(new FormData(this.form).entries())
			this.fieldset?.setAttribute('disabled', '')

			await this.submit()
		} catch (error) {
			console.error(error)

			if (this.#responseSpan) this.setResponse({ error: true })
		} finally {
			this.fieldset?.removeAttribute('disabled')
		}
	}

	/** @param {{ error?: boolean, message?: string }} [options] */
	setResponse({ error = false, message = 'Something went wrong' } = {}) {
		if (error) this.form?.setAttribute('data-error', '')
		else this.form?.removeAttribute('data-error')

		if (this.#responseSpan) this.#responseSpan.textContent = message

		setTimeout(() => {
			if (this.#responseSpan?.textContent)
				this.#responseSpan.textContent = null
		}, 3000)
	}

	/** @returns {Promise<void> | void} */
	submit() {}
}
