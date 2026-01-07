import type { HTMLType, SesPluginOptions, SesPluginType } from './index.js'
import sesPlugin from './index.js'

declare module 'fastify' {
  interface FastifyInstance {
    html: HTMLType
    ses: SesPluginType
  }
}

export type { SesPluginOptions }
export default sesPlugin
