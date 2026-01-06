import fastifyAutoload from '@fastify/autoload'
import fastifySensible from '@fastify/sensible'
import closeWithGrace from 'close-with-grace'
import fastify from 'fastify'
import { exit } from 'process'

/** @param {number} [port] */
export default function build(port = 5000) {
	const app = fastify({
		logger: { transport: { target: '@fastify/one-line-logger' } }
	})

	app.register(fastifyAutoload, {
		dir: 'src/plugins',
		encapsulate: false,
		forceESM: true
	})
	app.register(fastifyAutoload, { dir: 'src/routes', forceESM: true })
	app.register(fastifySensible)

	closeWithGrace(async function ({ err }) {
		if (err) throw err

		await app.close()
	})

	app.listen({ port }, function (err) {
		if (err) {
			app.log.error(err)

			exit(1)
		}
	})
}
