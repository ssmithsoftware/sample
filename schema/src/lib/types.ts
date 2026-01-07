import type { QueryResult } from 'pg'
import type Schema from '../build/interface.js'
import type DragonSchema from '../index.js'
import type Build from './build.js'

type Definitions<T> = T extends { definitions: infer D } ? D : never
type Functions<T> = T extends { functions: infer F } ? F : never
type FunctionsProperties<T extends 'input' | 'output', U> = U extends {
	[K in T]: infer P
}
	? Properties<P>
	: never
type Properties<T> = T extends { properties: infer P } ? P : never
type Type<T> = T extends { type: infer U } ? U : never

type SchemaKey = keyof Schema & string
type Function<S extends SchemaKey> = Functions<Schema[S]>
type FunctionKey<S extends SchemaKey> = keyof Function<S> & string

type SchemaJSONKey = keyof Definitions<SchemaJSON> & string
type FunctionJSON<S extends SchemaJSONKey> = Definitions<
	Functions<Definitions<Definitions<SchemaJSON>[S]>>
>
type FunctionJSONKey<S extends SchemaJSONKey> = keyof FunctionJSON<S> & string

type InputJSONKey<
	S extends SchemaJSONKey,
	F extends FunctionJSONKey<S>
> = (keyof FunctionsProperties<'input', Definitions<FunctionJSON<S>[F]>>)[]
type OutputJSONKey<
	S extends SchemaJSONKey,
	F extends FunctionJSONKey<S>
> = (keyof FunctionsProperties<'output', Definitions<FunctionJSON<S>[F]>>)[]

type TupleArray<
	S extends SchemaJSONKey,
	F extends FunctionJSONKey<S>,
	Keys extends InputJSONKey<S, F> | OutputJSONKey<S, F>,
	Values extends any[]
> = { [K in keyof Keys & keyof Values]: [Keys[K], Values[K]] }
type TupleArrayObject<
	S extends SchemaJSONKey,
	F extends FunctionJSONKey<S>,
	Keys extends InputJSONKey<S, F> | OutputJSONKey<S, F>,
	Values extends any[]
> = { [T in TupleArray<S, F, Keys, Values>[number] as T[0]]: T[1] }

export type BuildOptions = Partial<
	Parameters<Functions<Build['ss']>['getSchema']>[number]
>

export type Input<S extends SchemaKey, F extends FunctionKey<S>> = Parameters<
	Function<S>[F] extends { (...args: any): any } ? Function<S>[F] : never
>
export type InputObject<
	S extends SchemaJSONKey,
	F extends FunctionKey<S> & FunctionJSONKey<S>,
	Keys extends InputJSONKey<S, F>
> = TupleArrayObject<S, F, Keys, Input<S, F>>

export type Output<S extends SchemaKey, F extends FunctionKey<S>> = ReturnType<
	Function<S>[F] extends { (...args: any): any } ? Function<S>[F] : never
>
export type OutputObject<
	S extends SchemaJSONKey,
	F extends FunctionKey<S> & FunctionJSONKey<S>,
	Keys extends OutputJSONKey<S, F>
> = TupleArrayObject<S, F, Keys, Output<S, F>>

export type Property<S> = {
	[Key in keyof Properties<S>]: Type<Properties<S>[Key]>
}

export type ReferenceJSON = Awaited<
	ReturnType<DragonSchema['build']>
>['reference']
export { type default as ReferenceJSONType } from '../build/reference.json' with { type: 'json' }

export type SchemaJSON = Awaited<ReturnType<DragonSchema['build']>>['schema']
export { type default as SchemaJSONType } from '../build/schema.json' with { type: 'json' }

export type { Schema }

export declare function select<
	S extends SchemaKey = SchemaKey,
	F extends FunctionKey<S> = FunctionKey<S>
>(
	schema: S,
	fn: F
): { execute(...args: Input<S, F>): Promise<QueryResult<Output<S, F>>['rows']> }
