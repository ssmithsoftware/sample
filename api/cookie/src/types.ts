import '@fastify/cookie'
import type { UnsignResult } from '@fastify/cookie'
import type { CookiePluginType } from './index.js'
import cookiePlugin from './index.js'

declare module 'fastify' {
	interface FastifyContextConfig {
		signed?: boolean
	}

	interface FastifyInstance {
		cookie: CookiePluginType
	}

	interface FastifyRequest {
		unsigned: UnsignResult | null
	}
}

export default cookiePlugin
