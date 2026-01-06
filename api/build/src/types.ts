import '@fastify/sensible'
import type {
	FastifyInstance,
	RawServerDefault,
	RouteGenericInterface,
	RouteHandlerMethod,
	RouteShorthandMethod,
	RouteShorthandOptions
} from 'fastify'
import type { IncomingMessage, ServerResponse } from 'http'
import build from './index.js'

type Handler<T extends RouteGenericInterface> = RouteHandlerMethod<
	RawServerDefault,
	IncomingMessage,
	ServerResponse<IncomingMessage>,
	T
>
type Options<T extends RouteGenericInterface> = RouteShorthandOptions<
	RawServerDefault,
	IncomingMessage,
	ServerResponse<IncomingMessage>,
	T
>
type Path = Parameters<RouteShorthandMethod>[0]

export type Route<T extends RouteGenericInterface = RouteGenericInterface> = {
	(path: Path, options: Options<T>, handler: Handler<T>): FastifyInstance
}

export default build
