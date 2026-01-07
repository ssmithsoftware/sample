/** @import { FastifyPluginAsync } from 'fastify' */

import fastifyEnv from '@fastify/env'
import DragonEnv from 'dragonenv'
import fastifyPlugin from 'fastify-plugin'

const envPlugin = /** @type {FastifyPluginAsync} */ (fastifyPlugin(
  async function (app) {
    const sEnv = new DragonEnv()

    await sEnv.build()

    app.register(fastifyEnv, { confKey: 'env', dotenv: { path: '.env.local' }, schema: sEnv.schema })
  }))

export default envPlugin
