/**
 * @import { BuildOptions } from 'dragonschema'
 * @import { FastifyInstance, FastifyPluginAsync } from 'fastify'
 * @import { PoolConfig } from 'pg'
 *
 * @typedef {{ build: BuildOptions, pool?: PoolConfig }} SchemaPluginOptions
 */

import DragonSchema from 'dragonschema'
import fastifyPlugin from 'fastify-plugin'

const schemaPlugin = /** @type {FastifyPluginAsync<SchemaPluginOptions>} */ (fastifyPlugin(
  /**
   * @param {FastifyInstance} app
   * @param {SchemaPluginOptions} options
   */
  async function (app, { build, pool }) {
    const sSchema = new DragonSchema({ pool })

    const { reference, schema } = await sSchema.build(build)

    app.addSchema(schema).decorate('reference', reference).decorate('select', sSchema.select.bind(sSchema)).decorate('throw', sSchema.throw)

    app.addHook('onClose', async function () {
      await sSchema.destroy()
    })
  }))

export default schemaPlugin
