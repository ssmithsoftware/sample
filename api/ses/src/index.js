/**
 * @import { FastifyInstance, FastifyPluginCallback } from 'fastify'
 *
 * @typedef {typeof html} HTMLType
 * @typedef {{ accessKeyId: string, region: string, secretAccessKey: string, source: string }} SesPluginOptions
 * @typedef {SesPlugin} SesPluginType
 */

import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import fastifyPlugin from 'fastify-plugin'

class SesPlugin {
	#client
	#source

	/** @param {SesPluginOptions} options */
	constructor({ accessKeyId, region, secretAccessKey, source }) {
		this.#client = new SESClient({
			credentials: { accessKeyId, secretAccessKey },
			region
		})
		this.#source = source
	}

	/**
	 * @param {string} subject
	 * @param {string} body
	 * @param {...string} to
	 */
	async send(subject, body, ...to) {
		const command = new SendEmailCommand({
			Destination: { ToAddresses: to },
			Message: {
				Subject: { Data: subject },
				Body: { Html: { Data: body } }
			},
			Source: this.#source
		})

		await this.#client.send(command)
	}
}

/**
 * @param {Parameters<typeof String.raw>[0]['raw']} strings
 * @param {...Parameters<typeof String.raw>[1]} values
 */
function html(strings, ...values) {
	return String.raw({ raw: strings }, ...values)
}

const sesPlugin = /** @type {FastifyPluginCallback<SesPluginOptions>} */ (
	fastifyPlugin(
		/**
		 * @param {FastifyInstance} app
		 * @param {SesPluginOptions} options
		 * @param {Parameters<FastifyPluginCallback>[2]} done
		 */
		function (app, options, done) {
			app.decorate('html', html).decorate('ses', new SesPlugin(options))

			done()
		}
	)
)

export default sesPlugin
