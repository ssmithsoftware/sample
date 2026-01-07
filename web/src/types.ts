import type CustomElement from './elements/custom.js'
import type FormElement from './elements/form.js'
import type FormControlElement from './elements/formctrl.js'
import type ModalElement from './elements/modal.js'
import type RouterElement from './elements/router.js'
import type { CustomElementPrefix } from './index.js'

interface CustomElements {
  custom: CustomElement
  form: FormElement
  formctrl: FormControlElement
  modal: ModalElement
  router: RouterElement
}

type CustomElementTagNameMap = {
  [Key in keyof CustomElements as `${CustomElementPrefix}-${Key}`]: CustomElements[Key]
}

type ExcludeKeyCustomListener = Exclude<keyof HTMLElementEventMap, 'custom-listener'>

type CustomListener = { [Key in ExcludeKeyCustomListener]: { listener: (event: HTMLElementEventMap[Key]) => void, type: Key } }[ExcludeKeyCustomListener]

interface RouterAppend { routeTemplates: HTMLTemplateElement[], siblingRouteTemplateId?: string, type?: 'layout' | 'route' }
interface RouterRequest { url: { id: 'fallbackId' | 'requestedId' } | string }
interface RouterSet { fallbackId: string | null, requestedId: string | null, routeId: string | null, success: boolean }

export interface CustomElementEventDetail {
  'custom-listener': CustomListener
  'router-append': RouterAppend
  'router-push': RouterRequest
  'router-replace': Partial<RouterRequest>
  'router-set': RouterSet
}

export type CustomElementEventMap = { [Key in keyof CustomElementEventDetail]: CustomEvent<CustomElementEventDetail[Key]> }

declare global {
  interface HTMLElementEventMap extends CustomElementEventMap {}
  interface HTMLElementTagNameMap extends CustomElementTagNameMap {}
}
