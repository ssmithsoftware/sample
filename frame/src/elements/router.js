/** @import { CustomElementEventDetail, CustomElementEventMap } from '../types.js' */

import { elementMissing } from '../index.js'
import CustomElement from './custom.js'

export default class RouterElement extends CustomElement {
	/**
	 * @typedef {{ host: Element, slots: NodeListOf<HTMLSlotElement>, template: HTMLTemplateElement }} Layout
	 * @typedef {'data-fallback-id' | 'data-route-id' | 'data-template-id'} ObservedAttributes
	 * @typedef {{ default?: boolean, nodes: SlotNode[], parentElement: HTMLElement }} SlotData
	 * @typedef {Node | SlotData} SlotNode
	 * @typedef {Map<HTMLSlotElement, SlotData>} Slots
	 */

	/** @type {ObservedAttributes[]} */
	static observedAttributes = [
		'data-fallback-id',
		'data-route-id',
		'data-template-id'
	]

	#elements = {
		div: document.createElement('div'),
		slot: document.createElement('slot'),
		template: document.createElement('template')
	}
	/** @type {HTMLTemplateElement | null} */
	#fallbackTemplate = null
	/** @type {Layout[]} */
	#layouts = []
	/** @type {Set<HTMLElement>} */
	#listeners = new Set()
	/** ```id``` of the programmatically constructed root schema. */
	#rootId = 'root'
	/** @type {HTMLTemplateElement | null} */
	#rootTemplate = null
	/** @type {HTMLTemplateElement | null} */
	#routesTemplate = null
	/** @type {Slots} */
	#slots = new Map()
	/**
	 * White-listed properties that may be programmatically invoked during a route request.
	 * @type {Exclude<CustomElementEventDetail['router-push']['url'], string>['id'][]}
	 */
	#urlIds = ['fallbackId', 'requestedId']

	/** ```id``` of the catch-all fallback route. */
	get fallbackId() {
		return this.dataset.fallbackId ?? null
	}

	/** @param {string | null} value */
	set fallbackId(value) {
		if (value) this.dataset.fallbackId = value
		else delete this.dataset.fallbackId
	}

	/**
	 * ```id``` of the initially requested route. Will **not** match the ```id``` of the currently active route when not found.
	 * @type {string | null}
	 */
	requestedId = null

	/** ```id``` of the currently active route. */
	get routeId() {
		return this.dataset.routeId ?? null
	}

	/** @param {string | null} value */
	set routeId(value) {
		if (value) this.dataset.routeId = value
		else delete this.dataset.routeId
	}

	/** ```id``` of the routes schema. */
	get templateId() {
		return this.dataset.templateId ?? null
	}

	/** @param {string | null} value */
	set templateId(value) {
		if (value) this.dataset.templateId = value
		else delete this.dataset.templateId
	}

	constructor() {
		super()

		this.addEventListener('click', this.#onClick)
		this.addEventListener('custom-listener', this.#onCustomListener)
		this.addEventListener('router-append', this.#onRouterAppend)
		this.addEventListener('router-push', this.#onRouterRequest)
		this.addEventListener('router-replace', this.#onRouterRequest)
	}

	/**
	 * @param {ObservedAttributes} name
	 * @param {string | null} oldValue
	 * @param {string | null} newValue
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (!newValue || newValue === oldValue) return

		switch (name) {
			case 'data-fallback-id':
				this.#onFallbackIdChanged(newValue)
				break
			case 'data-route-id':
				this.#onRouteIdChanged(newValue)
				break
			case 'data-template-id':
				this.#onTemplateIdChanged(newValue)
				break
		}
	}

	connectedCallback() {
		if (!this.templateId) this.templateId = 'routes'

		const onPopState = this.#onPopState.bind(this)

		window.addEventListener('popstate', onPopState)
		this.disconnectedCallbacks.push(() =>
			window.removeEventListener('popstate', onPopState)
		)

		this.#setRoute(location.pathname, location.search)
	}

	/** @param {boolean} success */
	#dispatchRouterSet(success) {
		queueMicrotask(() => {
			/** @type {CustomElementEventDetail['router-set']} */
			const detail = {
				fallbackId: this.fallbackId,
				requestedId: this.requestedId,
				routeId: this.routeId,
				success
			}

			for (const listener of this.#listeners) {
				if (listener.isConnected)
					listener.dispatchEvent(
						new CustomEvent('router-set', { detail })
					)
				else this.#listeners.delete(listener)
			}
		})
	}

	/**
	 * Used to gather or generate default templates required for router configuration.
	 *
	 * Do not use for setting route templates.
	 *
	 * @param {string} id
	 * @param {Document | HTMLTemplateElement | ShadowRoot} node
	 */
	#getDefaultTemplate(id, node) {
		const defaultTemplate =
			(node instanceof HTMLTemplateElement
				? node.content
				: node
			).getElementById(id) ?? this.#elements.template.cloneNode()

		if (!(defaultTemplate instanceof HTMLTemplateElement))
			throw new Error(
				`${elementMissing({ selectors: `template#${id}`, shadowRoot: node instanceof ShadowRoot })}${node instanceof Document ? ' in document' : node instanceof HTMLTemplateElement ? ` in template#${node.id}` : ''}`
			)
		else if (!defaultTemplate.id) defaultTemplate.id = id

		return defaultTemplate
	}

	/**
	 * @param {SlotNode} [node]
	 * @returns {Node | null}
	 */
	#getReferenceNode(node) {
		if (node instanceof Node) return node
		else if (node) return this.#getReferenceNode(node.nodes[0])
		else return null
	}

	/** @param {string} pathname */
	#getRouteParentId(pathname) {
		return `/${pathname
			.split('/')
			.filter(path => path)
			.slice(0, -1)
			.join('/')}`
	}

	/** @param {string} id */
	#getRouteTemplateId(id) {
		if (id.startsWith('/')) return id
		else
			throw new Error(
				`template#${id} is invalid${import.meta.env.DEV ? '\n\nroute templates that do not begin with the character "/" will not match pathname and will never be found\n' : ''}`
			)
	}

	/**
	 * @param {HTMLSlotElement} slot
	 * @param {HTMLSlotElement} clonedSlot
	 */
	#getSlotData(slot, clonedSlot) {
		let slotData = this.#slots.get(slot)

		if (!slotData) {
			/** @type {Node[]} */
			const nodes = []

			const parentElement = clonedSlot.parentElement
			if (!parentElement)
				throw new Error('cloned slot parent element does not exist')

			if (slot.hasChildNodes()) {
				nodes.push(
					...slot
						.assignedNodes({ flatten: true })
						.map(node => node.cloneNode(true))
				)

				clonedSlot.replaceWith(...nodes)
			} else nodes.push(clonedSlot)

			slotData = { nodes, parentElement }
			this.#slots.set(slot, slotData)
		}

		return slotData
	}

	/**
	 * @param {string} id
	 * @returns {never}
	 */
	#htmlError(id) {
		throw new Error(
			`HTML is not configured correctly for template#${id}${import.meta.env.DEV ? `\n\nTo get started,\nSpecify a template#${id} in template#${this.templateId} using the following structure:\n\n<template id="${this.templateId}">\n\t<div>\t<!-- This parent <div> begins a new layout using the contents of its first child <template> -->\n\t\t<template> ... </template>\t<!-- The layout to use for all siblings -->\n\t\t<template id="${id}"> ... </template>\t<!-- A route template. The id attribute is used for route requests -->\n\t\t<div> ... </div> <!-- Repeat this structure to start a nested layout -->\n\t</div>\n</template>\n` : ''}`
		)
	}

	/** @param {MouseEvent} event */
	#onClick(event) {
		const anchor =
			event.target instanceof Element ? event.target.closest('a') : null

		if (anchor && anchor.target !== '_blank') {
			event.preventDefault()

			this.#setRoute(anchor.pathname, anchor.search, () =>
				history.pushState(history.state, '', anchor.href)
			)
		}
	}

	/** @param {CustomElementEventMap['custom-listener']} event */
	#onCustomListener(event) {
		if (
			event.target instanceof HTMLElement &&
			event.detail?.type === 'router-set'
		) {
			event.target.addEventListener(
				event.detail.type,
				event.detail.listener
			)

			if (!this.#listeners.has(event.target))
				this.#listeners.add(event.target)
		}
	}

	/** @param {string} id */
	#onFallbackIdChanged(id) {
		if (this.#routesTemplate) {
			this.#fallbackTemplate = this.#getDefaultTemplate(
				this.#getRouteTemplateId(id),
				this.#routesTemplate
			)

			if (!this.#routesTemplate.content.contains(this.#fallbackTemplate))
				this.#routesTemplate.content
					.insertBefore(
						this.#elements.div.cloneNode(),
						this.#rootTemplate
					)
					.appendChild(this.#elements.template.cloneNode())
					.parentElement?.appendChild(this.#fallbackTemplate)
		}
	}

	#onPopState() {
		this.#setRouteIds(location.pathname)

		this.#dispatchRouterSet(true)
	}

	/** @param {string} id */
	#onRouteIdChanged(id) {
		if (this.fallbackId && this.#fallbackTemplate && this.#routesTemplate) {
			const routeTemplate = this.#routesTemplate.content.getElementById(
				this.#getRouteTemplateId(id)
			)

			if (routeTemplate instanceof HTMLTemplateElement)
				this.#setRouteTemplate(routeTemplate)
			else
				this.routeId = id.startsWith(this.fallbackId)
					? this.#getRouteParentId(id)
					: this.fallbackId
		} else this.#setRouteIds()
	}

	/** @param {CustomElementEventMap['router-append']} event */
	#onRouterAppend(event) {
		if (!this.#routesTemplate)
			throw new Error(
				elementMissing({ selectors: `template#${this.templateId}` })
			)

		const {
			routeTemplates,
			siblingRouteTemplateId = location.pathname,
			type = 'route'
		} = event.detail ?? {}

		let siblingRouteTemplate = this.#routesTemplate.content.getElementById(
			this.#getRouteTemplateId(siblingRouteTemplateId)
		)
		if (!(siblingRouteTemplate instanceof HTMLTemplateElement))
			throw new Error(
				`${elementMissing({ selectors: `template#${siblingRouteTemplateId}` })} in template#${this.templateId}`
			)

		for (const routeTemplate of routeTemplates) {
			if (!siblingRouteTemplate.parentElement)
				throw new Error(
					'sibling route template parent element does not exist'
				)

			this.#getRouteTemplateId(routeTemplate.id)

			if (type === 'route')
				siblingRouteTemplate =
					siblingRouteTemplate.parentElement.insertBefore(
						routeTemplate,
						siblingRouteTemplate.nextElementSibling
					)
			else {
				const clonedParentElement = this.#elements.div.cloneNode()
				if (!(clonedParentElement instanceof HTMLElement))
					throw new Error('parent element is not an HTMLElement')

				const clonedRouteTemplate = this.#elements.template.cloneNode()
				if (!(clonedRouteTemplate instanceof HTMLTemplateElement))
					throw new Error(
						'route template is not an HTMLTemplateElement'
					)

				clonedRouteTemplate.id = routeTemplate.id
				routeTemplate.removeAttribute('id')

				siblingRouteTemplate.parentElement
					.insertBefore(clonedParentElement, siblingRouteTemplate)
					.append(routeTemplate, clonedRouteTemplate)
			}
		}
	}

	/** @param {CustomElementEventMap['router-replace']} event */
	#onRouterRequest(event) {
		let urlString = this.fallbackId

		if (typeof event.detail?.url === 'string') urlString = event.detail.url
		else if (
			typeof event.detail?.url === 'object' &&
			this.#urlIds.includes(event.detail.url.id)
		) {
			const urlId = this[event.detail.url.id]

			if (urlId) urlString = urlId.concat(location.search)
		}

		if (typeof urlString !== 'string')
			throw new Error(`"${urlString}" is not a string`)

		const url = new URL(urlString, location.origin)

		/**
		 * slotchange events are fired after any previously queued microtasks, including those previously queued by any other execution context.
		 *
		 * After the last microtask completes, all slot changes; including any slotted slot changes "bubbling" through the DOM, occurring within the current execution context will fire slotchange events. These events will be batched together.
		 *
		 * This behavior is not exactly the same as programmatically invoking event handlers such as click or focus. These events will still be batched by execution context, but will be executed prior to any microtasks queued by the same execution context.
		 *
		 * Programmatic route requests may be dispatched at any time from within complex routing scenarios or during redirections. As elements are connected to the DOM, these requests may be launched synchronously or asynchronously.
		 *
		 * By default, these requests are queued as separate microtasks. They will follow any previous batches of slotchange events and keep all DOM changes intact for the scenarios mentioned above.
		 *
		 * All of this happens prior to passing the control of the event loop back to the browser for rendering.
		 */
		queueMicrotask(() =>
			this.#setRoute(url.pathname, url.search, () =>
				history[
					`${event.type.endsWith('push') ? 'push' : 'replace'}State`
				](history.state, '', url.href)
			)
		)
	}

	/** @param {Event} event */
	#onSlotChange(event) {
		if (!(event.target instanceof HTMLSlotElement))
			throw new Error('event target is not an HTMLSlotElement')

		const slot = this.#slots.get(event.target)
		if (!slot) throw new Error('slot does not exist')

		const nodes = event.target.assignedNodes()
		if (!nodes.length) nodes.push(event.target)

		/** @type {SlotNode[]} */
		const clonedNodes = []

		for (const node of nodes) {
			const clonedNode = node.cloneNode(true)

			slot.parentElement.insertBefore(
				clonedNode,
				this.#getReferenceNode(slot.nodes[0])
			)

			if (node instanceof Element && clonedNode instanceof Element) {
				clonedNode.removeAttribute('slot')

				if (
					node instanceof HTMLSlotElement &&
					clonedNode instanceof HTMLSlotElement
				) {
					if (event.target === node) this.#slots.delete(node)

					clonedNodes.push(this.#getSlotData(node, clonedNode))
				} else {
					const [nodeSlots, clonedNodeSlots] = [
						node.querySelectorAll('slot'),
						clonedNode.querySelectorAll('slot')
					]

					for (let index = 0; index < nodeSlots.length; index++) {
						const nodeSlot = nodeSlots[index]
						const clonedNodeSlot = clonedNodeSlots[index]

						if (
							nodeSlot instanceof HTMLSlotElement &&
							clonedNodeSlot instanceof HTMLSlotElement
						)
							this.#getSlotData(nodeSlot, clonedNodeSlot)
					}

					clonedNodes.push(clonedNode)
				}
			} else clonedNodes.push(clonedNode)
		}

		this.#removeSlotNodes(slot.nodes, slot.parentElement)
		slot.nodes = clonedNodes
	}

	/** @param {string} id */
	#onTemplateIdChanged(id) {
		const rootNode = this.getRootNode()
		if (
			!(rootNode instanceof Document) &&
			!(rootNode instanceof ShadowRoot)
		)
			throw new Error(
				'routes template root node is not a document or shadow root'
			)

		this.#routesTemplate = this.#getDefaultTemplate(id, rootNode)

		this.#rootTemplate = this.#getDefaultTemplate(
			this.#rootId,
			this.#routesTemplate
		)
		this.#routesTemplate.content
			.appendChild(this.#rootTemplate)
			.content.replaceChildren(this.#elements.slot.cloneNode())

		if (this.fallbackId) this.#onFallbackIdChanged(this.fallbackId)
		else this.fallbackId = '/'
	}

	/**
	 * @param {SlotNode[]} nodes
	 * @param {HTMLElement} parentElement
	 */
	#removeSlotNodes(nodes, parentElement) {
		for (const node of nodes) {
			if (node instanceof Node) parentElement.removeChild(node)
			else this.#removeSlotNodes(node.nodes, node.parentElement)
		}
	}

	/**
	 * @param {string} pathname
	 * @param {string} search
	 * @param {() => void} [onSuccess]
	 */
	#setRoute(pathname, search, onSuccess) {
		this.#setRouteIds(pathname)

		const success = pathname === this.routeId

		if (success) onSuccess?.()
		else if (this.routeId)
			history.replaceState(history.state, '', this.routeId.concat(search))

		this.#dispatchRouterSet(success)
	}

	/** @param {string} [pathname] */
	#setRouteIds(pathname) {
		this.requestedId = pathname ?? null
		this.routeId = pathname ?? null
	}

	/** @param {HTMLTemplateElement} routeTemplate */
	#setRouteTemplate(routeTemplate) {
		if (!this.#rootTemplate)
			throw new Error(
				`${elementMissing({ selectors: `template#${this.#rootId}` })} in template#${this.templateId}`
			)

		/** @type {HTMLTemplateElement[]} */
		const layoutTemplates = []

		let parentElement = routeTemplate.parentElement
		if (!parentElement) this.#htmlError(routeTemplate.id)

		while (parentElement) {
			const { firstElementChild } = parentElement

			if (
				firstElementChild instanceof HTMLTemplateElement &&
				firstElementChild !== routeTemplate
			)
				layoutTemplates.unshift(firstElementChild)
			else this.#htmlError(routeTemplate.id)

			parentElement = parentElement.parentElement
		}

		layoutTemplates.unshift(this.#rootTemplate)

		if (layoutTemplates.length < this.#layouts.length) {
			for (const layout of this.#layouts.splice(
				layoutTemplates.length,
				Infinity
			)) {
				for (const slot of layout.slots) {
					this.#slots.delete(slot)
				}
			}
		}

		for (let index = 0; index < layoutTemplates.length; index++) {
			const layoutTemplate = layoutTemplates[index]

			if (!layoutTemplate) this.#htmlError(routeTemplate.id)
			else if (layoutTemplate === this.#layouts[index]?.template) continue

			const ancestorLayout = this.#layouts[index - 1]

			const clonedHost = this.#elements.div.cloneNode()
			if (!(clonedHost instanceof Element))
				throw new Error('host is not an Element')

			const shadowRoot = clonedHost.attachShadow({ mode: 'closed' })

			const clonedLayoutTemplate = layoutTemplate.cloneNode(true)
			if (!(clonedLayoutTemplate instanceof HTMLTemplateElement))
				this.#htmlError(routeTemplate.id)

			/** @type {Layout} */
			const layout = {
				host: clonedHost,
				slots: clonedLayoutTemplate.content.querySelectorAll('slot'),
				template: layoutTemplate
			}

			if (ancestorLayout)
				shadowRoot
					.appendChild(ancestorLayout.host)
					.replaceChildren(...clonedLayoutTemplate.content.childNodes)
			else if (
				clonedLayoutTemplate.content.firstElementChild instanceof
				HTMLSlotElement
			) {
				const defaultSlot = shadowRoot.appendChild(
					clonedLayoutTemplate.content.firstElementChild
				)

				defaultSlot.addEventListener(
					'slotchange',
					this.#onSlotChange.bind(this)
				)

				this.#slots.set(defaultSlot, {
					default: true,
					nodes: [this.appendChild(defaultSlot.cloneNode())],
					parentElement: this
				})
			}

			this.#layouts.splice(index, Infinity, layout)
		}

		const childLayout = this.#layouts[layoutTemplates.length - 1]
		if (!childLayout) this.#htmlError(routeTemplate.id)

		childLayout.host.replaceChildren(routeTemplate.content.cloneNode(true))
		this.#rootTemplate.content.replaceChildren(childLayout.host)
	}
}
