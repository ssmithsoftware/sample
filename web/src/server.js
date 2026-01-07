import DragonEnv from 'dragonenv'
import { defineConfig } from 'vite'
import htmlPlugin from './parser.js'

const envPrefix = /** @type {const} */ ('PUBLIC')
const sEnv = new DragonEnv({ prefix: envPrefix })

await sEnv.build()

/** @param {number} [port] */
export default function build (port = 3000) {
  return defineConfig({ build: { modulePreload: false, target: 'esnext' }, envPrefix, plugins: [htmlPlugin], preview: { port }, server: { port } })
}
