import '@fastify/env'
import type { Schema } from 'dragonenv'
import envPlugin from './index.js'

declare module 'fastify' {
  interface FastifyInstance {
    env: Schema
  }
}

export default envPlugin
