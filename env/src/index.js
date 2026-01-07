/** @import { Client, ClientConfig } from 'pg' */

import { config } from 'dotenv'
import { readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import pg from 'pg'
import { env } from 'process'
import schemaJSON from './schema.json' with { type: 'json' }

const path = dirname(import.meta.dirname)
const ca = await readFile(join(path, 'cert.pem'), 'utf-8')

/* First value in path array takes precedence */
const { parsed } = config({ path: [join(path, `.env.${env.NODE_ENV ?? 'development'}`), join(path, '.env')] })

export default class DragonEnv {
  /** @type {Client} */
  client
  /** @type {string} */
  prefix
  /** @type {schemaJSON} */
  schema = schemaJSON

  /** @param {{ client?: ClientConfig, prefix?: string }} [options] */
  constructor (options) {
    this.client = new pg.Client({ ssl: { ca, rejectUnauthorized: true }, ...options?.client })
    this.prefix = options?.prefix ?? 'PUBLIC'
  }

  async build () {
    await this.client.connect()

    const { rows: [data] } = await this.client.query('SELECT * FROM acct.get_company_data();')
    if (!data) throw new Error('data does not exist')

    for (const key of Object.keys(data)) {
      data[`${this.prefix}_COMPANY_${key.toUpperCase()}`] = data[key]

      delete data[key]
    }

    let envLocal = ''
    for (const entry of Object.entries(Object.assign({}, { ...data, ...parsed, RDS_CERT: ca })).sort()) envLocal += `${entry[0]} = '${entry[1]}'\n`

    await Promise.all([writeFile('.env.local', envLocal), this.client.end()])
  }
}
