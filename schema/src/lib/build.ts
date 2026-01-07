export default interface Schema {
	ss: {
		functions: {
			getSchema(option: Schema['ss']['types']['getSchemaOption']): {
				getSchema: Schema['ss']['types']['getSchema']
			}
		}
		tables: {}
		types: {
			getSchema: {
				interface: string
				query: unknown
				reference: unknown
				schema: unknown
			}
			getSchemaOption: {
				baseUri: string
				output: Schema['ss']['types']['getSchemaOptionOutput']
				schemas: string[]
			}
			getSchemaOptionOutput: {
				functions: Schema['ss']['types']['getSchemaOptionOutputFunction']
				tables: boolean
				types: Schema['ss']['types']['getSchemaOptionOutputType']
			}
			getSchemaOptionOutputFunction: {
				output: Schema['ss']['types']['getSchemaOptionOutputFunctionOutput']
			}
			getSchemaOptionOutputFunctionOutput: { nullable: boolean }
			getSchemaOptionOutputType: { nullable: boolean; prefix: string }
		}
	}
}
