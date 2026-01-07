import DragonEnv from './index.js'

declare global {
	interface ImportMetaEnv extends SchemaWeb {}

	interface ImportMeta {
		readonly env: ImportMetaEnv
	}
}

type Properties = DragonEnv['schema']['properties']
type Schema = {
	[Key in keyof Properties]: Properties[Key] extends { type: infer T }
		? T
		: Properties[Key] extends { enum: string[] }
			? ['development', 'production']
			: never
}
type SchemaWeb = Pick<
	Schema,
	| 'PUBLIC_COMPANY_CITY'
	| 'PUBLIC_COMPANY_COUNTRY'
	| 'PUBLIC_COMPANY_DESCRIPTION'
	| 'PUBLIC_COMPANY_EMAIL'
	| 'PUBLIC_COMPANY_FONT'
	| 'PUBLIC_COMPANY_IMAGE'
	| 'PUBLIC_COMPANY_LINE_ONE'
	| 'PUBLIC_COMPANY_NAME'
	| 'PUBLIC_COMPANY_PHONE'
	| 'PUBLIC_COMPANY_POSTAL_CODE'
	| 'PUBLIC_COMPANY_STATE'
	| 'PUBLIC_COMPANY_STATIC_URL'
	| 'PUBLIC_COMPANY_WEBSITE'
	| 'PUBLIC_STRIPE_PUBLISHABLE_KEY'
	| 'PUBLIC_URL_API'
	| 'PUBLIC_URL_APP'
	| 'PUBLIC_URL_STREAM'
>

export default DragonEnv
export type { Schema, SchemaWeb }
