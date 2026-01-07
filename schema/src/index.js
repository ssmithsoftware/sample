/**
 * @import { Pool, PoolConfig } from 'pg'
 * @import { BuildOptions, ReferenceJSONType, SchemaJSONType, select } from './lib/types.js'
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import pg from 'pg'

const {
	BPCHAR,
	BYTEA,
	CHAR,
	DATE,
	FLOAT4,
	FLOAT8,
	INT2,
	INT4,
	INT8,
	JSON: JSONOid,
	JSONB,
	MONEY,
	NUMERIC,
	OID,
	TEXT,
	TIME,
	TIMESTAMP,
	TIMESTAMPTZ,
	TIMETZ,
	UUID,
	VARCHAR
} = pg.types.builtins
// const NAME = /** @type {const} */ (19) TODO: removed this because type error now on setTypeParser. Versioning issue? Can check pnpmlock

for (const oid of [JSONOid, JSONB]) pg.types.setTypeParser(oid, parseJSON)
for (const oid of [INT2, INT4, OID]) pg.types.setTypeParser(oid, parseNumber)
for (const oid of [FLOAT4, FLOAT8, INT8, NUMERIC])
	pg.types.setTypeParser(oid, parseNumberOrString)
for (const oid of [
	BPCHAR,
	BYTEA,
	CHAR,
	DATE,
	MONEY,
	TEXT,
	TIME,
	TIMESTAMP,
	TIMESTAMPTZ,
	TIMETZ,
	UUID,
	VARCHAR
])
	pg.types.setTypeParser(oid, parseString)

const path = join(import.meta.dirname, 'build')
const query = await readFile(
	join(import.meta.dirname, 'lib', 'query.sql'),
	'utf-8'
)

/**
 * @param {string} value
 * @see https://www.json.org/fatfree.html
 * @see https://stackoverflow.com/questions/13340717/json-numbers-regular-expression
 */
function isNumber(value) {
	return /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(value)
}

/** @param {string} value */
function parseJSON(value) {
	return JSON.parse(value, reviver)
}

/** @param {string} value */
function parseNumber(value) {
	return +value
}

/** @param {string} value */
function parseNumberOrString(value) {
	const number = +value

	if (Number.isSafeInteger(number)) return number
	else return value
}

/** @param {string} value */
function parseString(value) {
	return value
}

/**
 * @this {{ [key: string]: unknown }}
 * @param {string} _key
 * @param {unknown} value
 * @param {{ source: string }} [context]
 */
function reviver(_key, value, context) {
	const { source } = context ?? {}
	if (!source) return value

	const number = +source

	if (Number.isSafeInteger(number)) return number
	else if (isNumber(source)) return source
	else return value
}

export default class DragonSchema {
	/** @type {Pool} */
	pool
	/** @type {{ [key: string]: { [key: string]: string } } | null} */
	#query = null
	/** @type {ReferenceJSONType | null} */
	#reference = null
	/** @type {SchemaJSONType | null} */
	#schema = null

	/** @param {{ pool?: PoolConfig }} [options] */
	constructor(options) {
		this.pool = new pg.Pool(options?.pool)
	}

	/** @param {BuildOptions} [options] */
	async build(options) {
		const {
			baseUri = 'https://dragonschema.com',
			output = {
				functions: { output: { nullable: true } },
				tables: false,
				types: { nullable: true, prefix: 't_' }
			},
			schemas = ['public']
		} = options ?? {}

		const {
			rows: [data]
		} = await this.pool.query(query, [{ baseUri, output, schemas }])
		const {
			interface: interfaceStr,
			query: queryJSON,
			reference: referenceJSON,
			schema: schemaJSON
		} = data ?? {}

		this.#query = queryJSON
		this.#reference = referenceJSON
		this.#schema = schemaJSON
		if (
			typeof interfaceStr !== 'string' ||
			!this.#query ||
			!this.#reference ||
			!this.#schema
		)
			this.throw({
				interface: interfaceStr,
				query: queryJSON,
				reference: referenceJSON,
				schema: schemaJSON
			})

		await Promise.all([
			writeFile(join(path, 'interface.ts'), interfaceStr),
			writeFile(
				join(path, 'reference.json'),
				JSON.stringify(this.#reference)
			),
			writeFile(join(path, 'schema.json'), JSON.stringify(this.#schema))
		])

		return { reference: this.#reference, schema: this.#schema }
	}

	async destroy() {
		await this.pool.end()
	}

	/** @type {typeof select} */
	select(schema, fn) {
		const pool = this.pool

		const query = this.#query?.[schema]?.[fn]
		if (typeof query !== 'string')
			throw new Error(`${schema}.${fn} query does not exist`)

		return {
			async execute(...args) {
				return (await pool.query(query, [...args])).rows
			}
		}
	}

	/**
	 * @param {unknown} [data]
	 * @returns {never}
	 */
	throw(data) {
		throw new Error(`${JSON.stringify(data)} does not exist`)
	}
}
