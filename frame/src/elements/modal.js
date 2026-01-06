/** @import { CustomElementEventMap } from '../types.js' */

// TODO: when signing out in a brand new tab, does the history stack get filled with the dialog popup and then go missing? after replacing on sign-out there is a blank history record that sits on the sign-in page
// TODO: maybe do history.go(-2) ? think about how to completely remove it from the history stack

import { elementMissing } from '../index.js'
import CustomElement from './custom.js'

export default class ModalElement extends CustomElement {
	/** @typedef {'data-route-id' | 'data-template-id'} ObservedAttributes */

	/** @type {ObservedAttributes[]} */
	static observedAttributes = ['data-route-id', 'data-template-id']

	/** @type {HTMLAnchorElement | null} */
	#anchor = null
	/** @type {HTMLDialogElement | null} */
	#dialog = null
	/**
	 * ```id``` of the modal template.
	 * @type {string | null}
	 */
	#modalId = null
	/** @type {HTMLTemplateElement | null} */
	#modalTemplate = null
	/** @type {HTMLTemplateElement | null} */
	#modalsTemplate = null

	/** ```id``` of the currently active route. */
	get routeId() {
		return this.dataset.routeId ?? null
	}

	/** @param {string | null} value */
	set routeId(value) {
		if (value) this.dataset.routeId = value
		else delete this.dataset.routeId
	}

	// TODO: Make a shared element with RouterElement

	/** ```id``` of the modals schema. */
	get templateId() {
		return this.dataset.templateId ?? null
	}

	/** @param {string | null} value */
	set templateId(value) {
		if (value) this.dataset.templateId = value
		else delete this.dataset.templateId
	}

	/**
	 * @param {ObservedAttributes} name
	 * @param {string | null} oldValue
	 * @param {string | null} newValue
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (!newValue || newValue === oldValue) return

		switch (name) {
			case 'data-route-id':
				this.#onRouteIdChanged(newValue)
				break
			case 'data-template-id':
				this.#onTemplateIdChanged(newValue)
				break
		}
	}

	connectedCallback() {
		if (this.connected) return
		// TODO: should set routeId, templateId here? instead of inside acct and sortlists

		this.#anchor = this.querySelector('a')
		if (!this.#anchor) throw new Error(elementMissing({ selectors: 'a' }))

		this.#modalId = this.#anchor.pathname.concat(this.#anchor.search) // TODO: tested this is best and working?

		const modalTemplate =
			this.#modalsTemplate?.content
				.getElementById(this.#anchor.pathname)
				?.cloneNode(true) ?? null
		if (!(modalTemplate instanceof HTMLTemplateElement))
			throw new Error(
				`${elementMissing({ selectors: `template#${this.#anchor.pathname}` })} in template#${this.#modalsTemplate?.id}`
			)

		this.#modalTemplate = modalTemplate

		this.dispatch('custom-listener', {
			detail: { type: 'router-set', listener: this.#onRouterSet }
		})
		this.connected = true
	}

	/** @param {string} id */
	#onRouteIdChanged(id) {
		if (
			this.#anchor &&
			this.#anchor.pathname !== id &&
			this.#modalId &&
			this.#modalTemplate
		) {
			this.#anchor.href = id.concat(this.#modalId)
			this.#modalTemplate.id = this.#anchor.pathname

			this.dispatch('router-append', {
				detail: {
					routeTemplates: [this.#modalTemplate],
					siblingRouteTemplateId: id,
					type: 'route'
				}
			})
		}
	}

	/** @param {string} id */
	#onTemplateIdChanged(id) {
		const modalsTemplate = document.getElementById(id) // TODO: don't do this, remove all references to document and use root node instead. maybe make a helper for getRootNode and getDefaultTemplate
		if (!(modalsTemplate instanceof HTMLTemplateElement))
			throw new Error(elementMissing({ selectors: `template#${id}` }))

		this.#modalsTemplate = modalsTemplate
	}

	/** @param {CustomElementEventMap['router-set']} event */
	#onRouterSet(event) {
		if (this.#dialog?.open && this.#anchor?.pathname === this.routeId)
			this.#dialog.close() // TODO: test this better!!

		this.routeId = event.detail.routeId

		if (!this.#dialog) {
			this.#dialog = document.querySelector('dialog') // TODO: don't do this, remove all references to document and use root node instead
			if (!this.#dialog)
				throw new Error(elementMissing({ selectors: 'dialog' }))
		}

		// TODO: we should not need to replace location.search? Test this out more by adding logs on router-set dispatch and listeners

		/** The modal template is correctly in place after falling back to the current route. Try one last time to request the modal. */
		if (
			!event.detail.success &&
			event.detail.requestedId?.replace(location.search, '') ===
				this.#modalTemplate?.id
		)
			this.dispatch('router-replace', {
				detail: { url: { id: 'requestedId' } }
			})
		else if (this.#anchor?.pathname === this.routeId)
			this.#dialog.showModal()
	}
}
