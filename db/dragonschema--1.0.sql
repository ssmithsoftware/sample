-- complain if script is sourced in psql, rather than via CREATE EXTENSION
\echo Use "CREATE EXTENSION dragonschema" to load this file. \quit

DO $$
	DECLARE
		msg text;

	BEGIN
		CREATE TYPE ss.t_type_attribute AS ( dimensions smallint );

		CREATE TYPE ss.t_type_class AS ( kind "char" );

		CREATE TYPE ss.t_type_element AS ( category "char", class ss.t_type_class, name name, namespace oid, oid oid );

		CREATE TYPE ss.t_type AS ( attribute ss.t_type_attribute, category "char", class ss.t_type_class, element ss.t_type_element, name name, namespace oid, oid oid );

		CREATE TYPE ss.t_subschema_property_query AS ( input text, output text );

		CREATE TYPE ss.t_subschema_property_retrieval AS ( kind "char", namespace oid );

		CREATE TYPE ss.t_subschema_property_value_any_of_reference AS ( "$ref" text );

		CREATE TYPE ss.t_subschema_property_value_any_of_format AS ( format text, nullable boolean, type text );

		CREATE TYPE ss.t_subschema_property_value_any_of_type AS ( nullable boolean, type text );

		CREATE TYPE ss.t_subschema_property_value_item AS ( "$ref" text, "anyOf" json, format text, items json, nullable boolean, type text );

		CREATE TYPE ss.t_subschema_property_value AS ( "$ref" text, "anyOf" json, format text, items ss.t_subschema_property_value_item, nullable boolean, type text );

		CREATE TYPE ss.t_subschema_property AS ( interface text, key name, query ss.t_subschema_property_query, value ss.t_subschema_property_value );

		CREATE TYPE ss.t_subschema_value AS ( "additionalProperties" boolean, properties json, required text[], type text );

		CREATE TYPE ss.t_subschema AS ( interface text, key name, query text, value ss.t_subschema_value );

		CREATE TYPE ss.t_function_definition AS ( input ss.t_subschema_value, output ss.t_subschema_value );

		CREATE TYPE ss.t_function AS ( definitions ss.t_function_definition );

		CREATE TYPE ss.t_definition_value AS ( "$id" text, definitions json );

		CREATE TYPE ss.t_definition AS ( interface text, key name, query json, reference json, value ss.t_definition_value );

		CREATE TYPE ss.t_schema_definition AS ( functions ss.t_definition_value, tables ss.t_definition_value, types ss.t_definition_value );

		CREATE TYPE ss.t_schema AS ( "$id" text, definitions ss.t_schema_definition );

		CREATE TYPE ss.t_get_schema_option_output_function_output AS ( nullable boolean );

		CREATE TYPE ss.t_get_schema_option_output_function AS ( output ss.t_get_schema_option_output_function_output );

		CREATE TYPE ss.t_get_schema_option_output_type AS ( nullable boolean, prefix text );

		CREATE TYPE ss.t_get_schema_option_output AS ( functions ss.t_get_schema_option_output_function, tables boolean, types ss.t_get_schema_option_output_type );

		CREATE TYPE ss.t_get_schema_option AS ( base_uri text, output ss.t_get_schema_option_output, schemas text[] );

		CREATE TYPE ss.t_get_schema_schema AS ( "$id" text, "$schema" text, definitions json );

	EXCEPTION WHEN OTHERS THEN
		GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;

		RAISE NOTICE '%', msg;
	END;
$$;

CREATE OR REPLACE FUNCTION ss._lower (_key text) RETURNS text AS $$
	SELECT lower(left(_key, 1)) || right(_key, -1);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._pascal (_key text) RETURNS text AS $$
	SELECT replace(initcap(replace(_key, '_', ' ')), ' ', '');
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._camel (_key text) RETURNS text AS $$
	SELECT ss._lower(ss._pascal(_key));
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._camel (_value json) RETURNS json AS $$
	SELECT
		CASE
			WHEN _value IS JSON ARRAY THEN (SELECT json_agg(ss._camel(j.value)) FROM json_array_elements(_value) j)
			WHEN _value IS JSON OBJECT THEN (SELECT json_object_agg(ss._camel(j.key), ss._camel(j.value)) FROM json_each(_value) j)
			ELSE _value
		END;
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._snake (_key text) RETURNS text AS $$
	SELECT ltrim(lower(regexp_replace(_key, '([A-Z])', '_\1', 'g')), '_');
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._snake (_value json) RETURNS json AS $$
	SELECT
		CASE
			WHEN _value IS JSON ARRAY THEN (SELECT json_agg(ss._snake(j.value)) FROM json_array_elements(_value) j)
			WHEN _value IS JSON OBJECT THEN (SELECT json_object_agg(ss._snake(j.key), ss._snake(j.value)) FROM json_each(_value) j)
			ELSE _value
		END;
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._is_bigint (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 20; --int8
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_binary (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 17; -- bytea
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_boolean (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 16; -- bool
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_char (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 18; -- char
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_date (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1082; -- date
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_double (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 701; -- float8
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_float (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 700; -- float4
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_integer (_oid oid) RETURNS boolean AS $$
	SELECT _oid IN (21, 23, 26); -- int2, int4, oid
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_json (_oid oid) RETURNS boolean AS $$
	SELECT _oid IN (114, 3802); -- json, jsonb
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_money (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 790; -- money
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_numeric (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1700; -- numeric
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_numeric_type (_oid oid) RETURNS boolean AS $$
	SELECT ss._is_bigint(_oid) OR ss._is_double(_oid) OR ss._is_float(_oid) OR ss._is_numeric(_oid);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_string (_oid oid) RETURNS boolean AS $$
	SELECT _oid IN (19, 25, 1042, 1043); -- name, text, bpchar, varchar
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_time (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1083; -- time
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_timestamp (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1114; -- timestamp
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_timestamptz (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1184; -- timestamptz
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_timetz (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 1266; -- timetz
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_uuid (_oid oid) RETURNS boolean AS $$
	SELECT _oid = 2950; -- uuid
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._is_string_type (_oid oid) RETURNS boolean AS $$
	SELECT ss._is_binary(_oid) OR ss._is_char(_oid) OR ss._is_date(_oid) OR ss._is_money(_oid) OR ss._is_string(_oid) OR ss._is_time(_oid) OR ss._is_timestamp(_oid) OR ss._is_timestamptz(_oid) OR ss._is_timetz(_oid) OR ss._is_uuid(_oid);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_kind (_kind "char") RETURNS text AS $$
	SELECT
		CASE
			WHEN _kind = 'f' THEN 'functions'
			WHEN _kind = 'r' THEN 'tables'
			WHEN _kind = 'c' THEN 'types'
		END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_namespace (_namespace oid) RETURNS text AS $$
	SELECT ss._camel(_namespace::regnamespace::name);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_base_uri (_base_uri text) RETURNS text AS $$
	SELECT regexp_replace(rtrim(_base_uri), '\/+$', '', 'g') || '/';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_base_uri (_base_uri text, _namespace oid) RETURNS text AS $$
	SELECT ss._get_base_uri(_base_uri) || ss._get_namespace(_namespace);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_base_uri (_base_uri text, _kind "char", _namespace oid) RETURNS text AS $$
	SELECT ss._get_base_uri(_base_uri, _namespace) || '/' || ss._get_kind(_kind);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_definition (_base_uri text, _definition json, _interface text, _name name, _query json, _reference json) RETURNS ss.t_definition AS $$
	SELECT _interface, _name, _query, _reference, (_base_uri, _definition) WHERE _definition IS NOT NULL;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_interface (_interface text) RETURNS text AS $$
	SELECT 'export default interface Schema { ' || _interface || E' }\n';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_interface (_interface text, _name name) RETURNS text AS $$
	SELECT 'interface ' || ss._pascal(_name) || ' { ' || _interface || ' }';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_interface_object (_interface text, _name name) RETURNS text AS $$
	SELECT _name || ': {' || CASE WHEN _interface IS NOT NULL THEN ' ' || _interface || ' ' ELSE '' END || '}';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_interface_property (_property text) RETURNS text AS $$
	SELECT '[''' || _property || ''']';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_json_pointer (_name name) RETURNS text AS $$
	SELECT '#/definitions/' || _name;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_schema () RETURNS text AS $$
	SELECT 'http://json-schema.org/draft-07/schema';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema (_interface text, _keys text[], _name name, _property json, _query text) RETURNS ss.t_subschema AS $$
	SELECT _interface, _name, _query, (FALSE, _property, _keys, 'object') WHERE _property IS NOT NULL;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_type_element (_category "char", _kind "char", _name name, _namespace oid, _oid oid) RETURNS ss.t_type_element AS $$
	SELECT _category, ROW(_kind), _name, _namespace, _oid WHERE _oid IS NOT NULL;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_type_name (_kind "char", _name name, _prefix text) RETURNS text AS $$
	SELECT ss._camel(CASE WHEN _kind = 'c' AND starts_with(_name, _prefix) THEN right(_name, -length(_prefix)) ELSE _name END);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_retrieval_uri (_kind "char", _name name, _namespace oid, _option ss.t_get_schema_option, _retrieval ss.t_subschema_property_retrieval) RETURNS text AS $$
	SELECT CASE WHEN _kind <> (_retrieval).kind OR _namespace <> (_retrieval).namespace THEN '/' || ss._get_namespace(_namespace) || '/' || ss._get_kind(_kind) ELSE '' END || ss._get_json_pointer(ss._get_type_name(_kind, _name, (_option).output.types.prefix));
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_interface (_category "char", _dimensions smallint, _kind "char", _name name, _namespace oid, _nullable boolean, _oid oid, _option ss.t_get_schema_option) RETURNS text AS $$
	SELECT
		CASE
			WHEN _category = 'C' THEN ss._pascal(_namespace::regnamespace::name) || ss._get_interface_property(ss._get_kind(_kind)) || ss._get_interface_property(ss._get_type_name(_kind, _name, (_option).output.types.prefix))
			WHEN ss._is_boolean(_oid) THEN 'boolean'
			WHEN ss._is_integer(_oid) THEN 'number'
			WHEN ss._is_numeric_type(_oid) THEN CASE WHEN _dimensions > 0 THEN '(' ELSE '' END || 'number | string' || CASE WHEN _dimensions > 0 THEN ')' ELSE '' END
			WHEN ss._is_string_type(_oid) THEN 'string'
			WHEN ss._is_json(_oid) THEN 'unknown'
		END ||
		CASE WHEN _dimensions > 0 THEN repeat('[]', _dimensions) ELSE '' END ||
		CASE WHEN _nullable THEN ' | null' ELSE '' END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_query_input (_category "char", _oid oid, _ordinality bigint) RETURNS text AS $$
	SELECT CASE WHEN _category = 'C' THEN '(SELECT array_agg(j) FROM json_populate_recordset(NULL::' || _oid::regtype || ', ss._snake($' || _ordinality || '::json)) j)' ELSE '$' || _ordinality END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_query_input (_ordinality bigint, _type ss.t_type) RETURNS text AS $$
	SELECT
		CASE
			WHEN (_type).category = 'A' THEN ss._get_subschema_property_query_input((_type).element.category, (_type).element.oid, _ordinality)
			WHEN (_type).category = 'C' THEN '(SELECT json_populate_record(NULL::' || (_type).oid::regtype || ', ss._snake($' || _ordinality || '::json)))'
			ELSE '$' || _ordinality
		END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_query_output (_name name, _type ss.t_type) RETURNS text AS $$
	SELECT CASE WHEN (_type).category = 'C' OR ((_type).category = 'A' AND (_type).element.category = 'C') THEN 'ss._camel(to_json("' || _name || '")) AS ' ELSE '' END || '"' || _name || '"';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_query (_mode "char", _name name, _ordinality bigint, _type ss.t_type) RETURNS ss.t_subschema_property_query AS $$
	SELECT
		CASE
			WHEN _mode = 'b' THEN (ss._get_subschema_property_query_input(_ordinality, _type), ss._get_subschema_property_query_output(_name, _type))::ss.t_subschema_property_query
			WHEN _mode = 'i' OR _mode IS NULL THEN (ss._get_subschema_property_query_input(_ordinality, _type), NULL)::ss.t_subschema_property_query
			WHEN _mode = 'o' OR _mode = 't' THEN (NULL, ss._get_subschema_property_query_output(_name, _type))::ss.t_subschema_property_query
			WHEN _mode = 'v' THEN ('VARIADIC ' || ss._get_subschema_property_query_input((_type).element.category, (_type).element.oid, _ordinality), NULL)::ss.t_subschema_property_query
		END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_reference (_category "char", _kind "char", _name name, _namespace oid, _nullable boolean, _option ss.t_get_schema_option, _retrieval ss.t_subschema_property_retrieval) RETURNS text AS $$
	SELECT ss._get_retrieval_uri(_kind, _name, _namespace, _option, _retrieval) WHERE _category = 'C' AND _nullable IS DISTINCT FROM TRUE;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_any_of_format (_nullable boolean, _oid oid) RETURNS ss.t_subschema_property_value_any_of_format AS $$
	SELECT
		CASE
			WHEN ss._is_float(_oid) THEN 'float'
			WHEN ss._is_bigint(_oid) THEN 'int64'
			ELSE 'double'
		END,
		NULLIF(_nullable, FALSE),
		'string';
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_any_of (_category "char", _kind "char", _name name, _namespace oid, _nullable boolean, _oid oid, _option ss.t_get_schema_option, _retrieval ss.t_subschema_property_retrieval) RETURNS json AS $$
	SELECT
		CASE
			WHEN _category = 'C' AND _nullable IS NOT DISTINCT FROM TRUE THEN json_build_array(ROW(ss._get_retrieval_uri(_kind, _name, _namespace, _option, _retrieval))::ss.t_subschema_property_value_any_of_reference, (NULL, 'null')::ss.t_subschema_property_value_any_of_type)
			WHEN ss._is_numeric_type(_oid) THEN json_build_array(ss._get_subschema_property_value_any_of_format(_nullable, _oid), (NULLIF(_nullable, FALSE), 'number')::ss.t_subschema_property_value_any_of_type)
		END;
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_format (_oid oid) RETURNS text AS $$
	SELECT
		CASE
			WHEN ss._is_date(_oid) THEN 'date'
			WHEN ss._is_time(_oid) THEN 'iso-time'
			WHEN ss._is_timestamp(_oid) THEN 'iso-date-time'
			WHEN ss._is_timestamptz(_oid) THEN 'date-time'
			WHEN ss._is_timetz(_oid) THEN 'time'
			WHEN ss._is_uuid(_oid) THEN 'uuid'
		END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_nullable (_category "char", _nullable boolean, _oid oid) RETURNS boolean AS $$
	SELECT _nullable WHERE _category <> 'C' AND NOT ss._is_numeric_type(_oid);
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_type (_oid oid) RETURNS text AS $$
	SELECT
		CASE
			WHEN _oid IS NULL THEN 'array'
			WHEN ss._is_boolean(_oid) THEN 'boolean'
			WHEN ss._is_integer(_oid) THEN 'number'
			WHEN ss._is_json(_oid) THEN 'object'
			WHEN ss._is_string_type(_oid) THEN 'string'
		END;
$$ IMMUTABLE LANGUAGE sql PARALLEL SAFE;

CREATE OR REPLACE FUNCTION ss._get_subschema_property_value_item (_category "char", _dimensions smallint, _kind "char", _name name, _namespace oid, _nullable boolean, _oid oid, _option ss.t_get_schema_option, _retrieval ss.t_subschema_property_retrieval) RETURNS ss.t_subschema_property_value_item AS $$
	SELECT
		CASE WHEN _dimensions = 1 THEN ss._get_subschema_property_value_reference(_category, _kind, _name, _namespace, _nullable, _option, _retrieval) END,
		CASE WHEN _dimensions = 1 THEN ss._get_subschema_property_value_any_of(_category, _kind, _name, _namespace, _nullable, _oid, _option, _retrieval) END,
		CASE WHEN _dimensions = 1 THEN ss._get_subschema_property_value_format(_oid) END,
		CASE WHEN _dimensions > 1 THEN to_json(ss._get_subschema_property_value_item(_category, (_dimensions - 1)::smallint, _kind, _name, _namespace, _nullable, _oid, _option, _retrieval)) END,
		CASE WHEN _dimensions = 1 THEN ss._get_subschema_property_value_nullable(_category, _nullable, _oid) END,
		ss._get_subschema_property_value_type(CASE WHEN _dimensions = 1 THEN _oid END);
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._get_subschema_properties (_mode "char", _name name, _nullable boolean, _option ss.t_get_schema_option, _ordinality bigint, _retrieval ss.t_subschema_property_retrieval, _type ss.t_type) RETURNS SETOF ss.t_subschema_property AS $$
	SELECT
		CASE
			WHEN (_type).element IS NULL THEN ss._get_subschema_property_interface((_type).category, (_type).attribute.dimensions, (_type).class.kind, (_type).name, (_type).namespace, _nullable, (_type).oid, _option)
			ELSE ss._get_subschema_property_interface((_type).element.category, (_type).attribute.dimensions, (_type).element.class.kind, (_type).element.name, (_type).element.namespace, _nullable, (_type).element.oid, _option)
		END,
		_name,
		CASE WHEN _ordinality IS NOT NULL THEN ss._get_subschema_property_query(_mode, _name, _ordinality, _type) END,
		(
			ss._get_subschema_property_value_reference((_type).category, (_type).class.kind, (_type).name, (_type).namespace, _nullable, _option, _retrieval),
			ss._get_subschema_property_value_any_of((_type).category, (_type).class.kind, (_type).name, (_type).namespace, _nullable, (_type).oid, _option, _retrieval),
			ss._get_subschema_property_value_format((_type).oid),
			CASE WHEN (_type).attribute.dimensions > 0 THEN ss._get_subschema_property_value_item((_type).element.category, (_type).attribute.dimensions, (_type).element.class.kind, (_type).element.name, (_type).element.namespace, _nullable, (_type).element.oid, _option, _retrieval) END,
			CASE WHEN (_type).category <> 'A' THEN ss._get_subschema_property_value_nullable((_type).category, _nullable, (_type).oid) END,
			ss._get_subschema_property_value_type(CASE WHEN (_type).category <> 'A' THEN (_type).oid END)
		);
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._get_subschema_properties (_kind "char", _modes "char"[], _names name[], _namespace oid, _oids oid[], _option ss.t_get_schema_option, _strict boolean) RETURNS TABLE (ordinality bigint, property ss.t_subschema_property) AS $$
	SELECT u.ordinality, p
	FROM unnest(_modes, _names, _oids) WITH ORDINALITY u (mode, name, oid, ordinality)
	JOIN pg_type t USING (oid)
	LEFT JOIN pg_class c ON t.typrelid = c.oid
	LEFT JOIN pg_type t2 ON t.typelem = t2.oid
	LEFT JOIN pg_class c2 ON t2.typrelid = c2.oid,
	ss._get_subschema_properties(
		u.mode,
		CASE WHEN u.name IS NULL OR u.name = '' THEN '$' || u.ordinality ELSE ss._camel(u.name) END,
		CASE WHEN _strict IS DISTINCT FROM TRUE THEN TRUE END,
		_option,
		u.ordinality,
		(_kind, _namespace),
		(
			CASE WHEN t2.oid IS NOT NULL THEN ROW(1::smallint)::ss.t_type_attribute END, -- Arguments not associated with any relation will not have a pg_attribute row. Use a referenced table or type for multidimensional arrays.
			t.typcategory,
			ROW(c.relkind),
			ss._get_type_element(t2.typcategory, c2.relkind, t2.typname, t2.typnamespace, t2.oid),
			t.typname,
			t.typnamespace,
			t.oid
		)
	) p;
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss._get_search_paths (_schemas text[]) RETURNS TABLE (path text) AS $$
	SELECT u.path
	FROM current_setting('search_path') s (path), string_to_table(s.path, ',') t (path)
	JOIN unnest(_schemas) u (path) ON CASE WHEN t.path = '"$user"' THEN user ELSE trim(t.path) END = u.path;
$$ LANGUAGE sql PARALLEL SAFE STABLE;

CREATE OR REPLACE FUNCTION ss.get_schemas (_option ss.t_get_schema_option DEFAULT ('https://dragonschema.com', (ROW(ROW(TRUE)), FALSE, ROW(TRUE, 't_')), ARRAY['public'])) RETURNS TABLE (interface text, query json, reference json, schema json) AS $$
	SELECT
		string_agg(ss._get_interface(concat_ws(', ', ss._get_interface_object((t).functions.interface, COALESCE((t).functions.key, 'functions')), ss._get_interface_object((t2).tables.interface, COALESCE((t2).tables.key, 'tables')), ss._get_interface_object((t2).types.interface, COALESCE((t2).types.key, 'types'))), n.nspname), '; ' ORDER BY n.nspname) || '; ' || ss._get_interface(string_agg(concat_ws(': ', ss._camel(n.nspname), ss._pascal(n.nspname)), ', ' ORDER BY n.nspname)),
		json_strip_nulls(json_object_agg(ss._camel(n.nspname), COALESCE((t).functions.query, '{}'::json) ORDER BY n.nspname)),
		json_strip_nulls(json_object_agg(ss._camel(n.nspname), COALESCE((t).functions.reference, '{}'::json) ORDER BY n.nspname)),
		json_strip_nulls(to_json((ss._get_base_uri((_option).base_uri), ss._get_schema(), json_object_agg(ss._camel(n.nspname), (ss._get_base_uri((_option).base_uri, n.oid), ((t).functions.value, (t2).tables.value, (t2).types.value))::ss.t_schema ORDER BY n.nspname))::ss.t_get_schema_schema))
	FROM pg_namespace n
	LEFT JOIN LATERAL (
		SELECT ss._get_definition(f.base_uri, json_object_agg(f.key, f.function ORDER BY f.key) FILTER (WHERE f.function IS NOT NULL), string_agg(f.key || ' ' || f.interface, ', ' ORDER BY f.key), ss._get_kind(f.kind), json_object_agg(f.key, f.query ORDER BY f.key), json_object_agg(f.key, f.base_uri || ss._get_json_pointer(f.key) || '/definitions' ORDER BY f.key) FILTER (WHERE f.function IS NOT NULL))
		FROM (
			SELECT
				ss._get_base_uri((_option).base_uri, p.prokind, n.oid),
				CASE WHEN i.subschema IS NOT NULL OR o.subschema IS NOT NULL THEN ROW(((i).subschema.value, (o).subschema.value))::ss.t_function END,
				'(' || CASE WHEN i.subschema IS NOT NULL THEN (i).subschema.interface ELSE '' END || '): ' || CASE WHEN o.subschema IS NOT NULL THEN '{ ' || (o).subschema.interface || ' }' ELSE 'void' END,
				ss._camel(p.proname) || CASE WHEN lag(p.proname) OVER w = p.proname THEN '$' || row_number() OVER w - 1 ELSE '' END,
				p.prokind,
				'SELECT ' || CASE WHEN o.subschema IS NOT NULL THEN (o).subschema.query || ' FROM ' ELSE '' END || n.nspname || '.' || p.proname || '(' || CASE WHEN i.subschema IS NOT NULL THEN (i).subschema.query ELSE '' END || ')' || CASE WHEN o.subschema IS NOT NULL THEN ' ' || CASE WHEN o.is_list THEN 'f (' ELSE '' END || o.columns || CASE WHEN o.is_list THEN ')' ELSE '' END ELSE '' END || ';'
			FROM pg_proc p,
			LATERAL (
				SELECT
					ss._get_subschema(
						string_agg((s).property.key || ': ' || (s).property.interface, ', ' ORDER BY s.ordinality),
						array_agg((s).property.key ORDER BY (s).property.key) FILTER (WHERE s.ordinality <= p.pronargs - p.pronargdefaults),
						p.proname,
						json_object_agg((s).property.key, (s).property.value ORDER BY (s).property.key),
						string_agg((s).property.query.input, ', ' ORDER BY s.ordinality)
					)
				FROM ss._get_subschema_properties(p.prokind, p.proargmodes[:p.pronargs], p.proargnames[:p.pronargs], p.pronamespace, p.proargtypes[:p.pronargs - 1], _option, p.proisstrict) s
				WHERE p.pronargs > 0
			) i (subschema),
			LATERAL (
				SELECT
					string_agg('"' || (s).property.key || '"', ', ' ORDER BY s.ordinality),
					max(s.ordinality) > 1,
					ss._get_subschema(
						string_agg((s).property.key || ': ' || (s).property.interface, ', ' ORDER BY s.ordinality),
						array_agg((s).property.key ORDER BY (s).property.key),
						p.proname,
						json_object_agg((s).property.key, (s).property.value ORDER BY (s).property.key),
						string_agg((s).property.query.output, ', ' ORDER BY s.ordinality)
					)
				FROM
					ss._get_subschema_properties(
						p.prokind,
						CASE WHEN p.proargmodes[p.pronargs + 1] IS NOT NULL THEN p.proargmodes[p.pronargs + 1:] ELSE ARRAY['o'::"char"] END,
						CASE WHEN p.proargnames[p.pronargs + 1] IS NOT NULL THEN p.proargnames[p.pronargs + 1:] ELSE ARRAY[p.proname] END,
						p.pronamespace,
						CASE WHEN p.proallargtypes[p.pronargs + 1] IS NOT NULL THEN p.proallargtypes[p.pronargs + 1:] ELSE ARRAY[p.prorettype] END,
						_option,
						NOT (_option).output.functions.output.nullable
					) s
				WHERE p.prorettype <> 2278 -- void
			) o (columns, is_list, subschema)
			WHERE n.oid = p.pronamespace AND (_option).output.functions IS NOT NULL AND p.prokind = 'f' AND NOT starts_with(p.proname, '_')
			WINDOW w AS (PARTITION BY p.proname ORDER BY p.pronargs, p.proargtypes)
		) f (base_uri, function, interface, key, kind, query)
		GROUP BY f.base_uri, f.kind
	) t (functions) ON TRUE
	LEFT JOIN LATERAL (
		WITH t (class, definition) AS (
			SELECT ROW(c.relkind)::ss.t_type_class, ss._get_definition(ss._get_base_uri((_option).base_uri, c.relkind, n.oid), json_object_agg((s).subschema.key, (s).subschema.value ORDER BY (s).subschema.key), string_agg(ss._get_interface_object((s).subschema.interface, (s).subschema.key), ', ' ORDER BY (s).subschema.key), ss._get_kind(c.relkind), NULL, NULL)
			FROM pg_type t
			JOIN pg_class c ON t.typrelid = c.oid,
			LATERAL (
				SELECT
					ss._get_subschema(
						string_agg(p.key || ': ' || p.interface, ', ' ORDER BY p.key),
						array_agg(p.key ORDER BY p.key) FILTER (WHERE c.relkind = 'c' OR (a.attnotnull AND NOT a.atthasdef)),
						ss._get_type_name(c.relkind, t.typname, (_option).output.types.prefix),
						json_object_agg(p.key, p.value ORDER BY p.key),
						NULL
					)
				FROM pg_attribute a
				JOIN pg_type t2 ON a.atttypid = t2.oid
				LEFT JOIN pg_class c2 ON t2.typrelid = c2.oid
				LEFT JOIN pg_type t3 ON t2.typelem = t3.oid
				LEFT JOIN pg_class c3 ON t3.typrelid = c3.oid,
				ss._get_subschema_properties(
					NULL,
					ss._camel(a.attname),
					CASE WHEN NOT a.attnotnull AND (_option).output.types.nullable THEN TRUE END,
					_option,
					NULL,
					(c.relkind, t.typnamespace),
					(ROW(a.attndims), t2.typcategory, ROW(c2.relkind), ss._get_type_element(t3.typcategory, c3.relkind, t3.typname, t3.typnamespace, t3.oid), t2.typname, t2.typnamespace, t2.oid)
				) p
				WHERE a.attnum > 0 AND t.typrelid = a.attrelid
			) s (subschema)
			WHERE ((c.relkind = 'c' AND (_option).output.types IS NOT NULL) OR (c.relkind = 'r' AND (_option).output.tables)) AND n.oid = t.typnamespace AND NOT starts_with(t.typname, '_')
			GROUP BY c.relkind
		),
		t2 (definition) AS (SELECT t.definition FROM t WHERE (t).class.kind = 'r'),
		t3 (definition) AS (SELECT t.definition FROM t WHERE (t).class.kind = 'c')
		SELECT t2.definition, t3.definition FROM t2 FULL JOIN t3 ON TRUE
	) t2 (tables, types) ON TRUE
	WHERE n.nspname = ANY ((_option).schemas);
$$ LANGUAGE sql PARALLEL SAFE STABLE STRICT;
