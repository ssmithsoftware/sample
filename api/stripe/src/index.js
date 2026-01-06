/**
 * @import { FastifyInstance, FastifyPluginCallback } from 'fastify'
 *
 * @typedef {{ secretKey: string }} StripePluginOptions
 */

import fastifyPlugin from 'fastify-plugin'
import Stripe from 'stripe'

const stripePlugin = /** @type {FastifyPluginCallback<StripePluginOptions>} */ (
	fastifyPlugin(
		/**
		 * @param {FastifyInstance} app
		 * @param {StripePluginOptions} options
		 * @param {Parameters<FastifyPluginCallback>[2]} done
		 */
		function (app, { secretKey }, done) {
			app.decorate(
				'stripe',
				new Stripe(secretKey, { apiVersion: '2025-04-30.basil' })
			)

			done()
		}
	)
)

export default stripePlugin
