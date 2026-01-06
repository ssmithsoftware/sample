import type DragonSchema from 'dragonschema'
import type { ReferenceJSON } from 'dragonschema'
import schemaPlugin from './index.js'

declare module 'fastify' {
	interface FastifyInstance {
		reference: ReferenceJSON
		select: DragonSchema['select']
		throw: DragonSchema['throw']
	}
}

export default schemaPlugin
