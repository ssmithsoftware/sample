/**
 * @import { CookieSerializeOptions } from '@fastify/cookie'
 * @import { FastifyInstance, FastifyPluginCallback } from 'fastify'
 *
 * @typedef {{ secret: string, website: string }} CookiePluginOptions
 * @typedef {CookiePlugin} CookiePluginType
 */

import fastifyCookie from '@fastify/cookie'
import fastifyPlugin from 'fastify-plugin'

const isProduction = process.env.NODE_ENV === 'production'
const name = /** @type {const} */ ('sessionId')

// const pattern = `${isProduction ? '__Host-' : ''}${name}`
// TODO: cookie is not clearing on production only? Check into this
// TODO: 9/10/25 dragonapi refactor: Check into the above error? Should append __Host- to name for production

class CookiePlugin {
	#domain
	name

	/** @param {CookiePluginOptions['website']} website */
	constructor(website) {
		const domain = website.split('//')[1]
		if (!domain)
			throw new Error(
				'domain does not exist. Did you specify a full website address? Ex. https://website.com'
			)

		this.#domain = domain
		this.name = name
	}

	/** @returns {CookieSerializeOptions} */
	getOptions() {
		const now = new Date()

		return {
			domain: isProduction ? this.#domain : undefined,
			expires: new Date(new Date(now).setDate(now.getDate() + 7)),
			httpOnly: true,
			path: '/',
			sameSite: 'strict',
			secure: isProduction,
			signed: true
		}
	}
}

const cookiePlugin = /** @type {FastifyPluginCallback<CookiePluginOptions>} */ (
	fastifyPlugin(
		/**
		 * @param {FastifyInstance} app
		 * @param {CookiePluginOptions} options
		 * @param {Parameters<FastifyPluginCallback>[2]} done
		 */
		function (app, { secret, website }, done) {
			app.register(fastifyCookie, { secret })
				.decorate('cookie', new CookiePlugin(website))
				.decorateRequest('unsigned', null)
				.addHook('onRequest', function (req, _reply, done) {
					if (req.routeOptions.config.signed)
						req.unsigned = req.unsignCookie(
							req.cookies[app.cookie.name] ?? ''
						)

					done()
				})

			done()
		}
	)
)

export default cookiePlugin
