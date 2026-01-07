/**
 * @import { XmlBuilderOptions } from 'fast-xml-parser'
 * @import { PluginOption } from 'vite'
 */

import { buildSync } from 'esbuild'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

/**
 * @param {string} tagName
 * @param {string} tagValue
 */
function tagValueProcessor (tagName, tagValue) {
  if (tagName === 'style') {
    return buildSync({
      minify: true,
      stdin: { contents: tagValue, loader: 'css' },
      write: false
    }).outputFiles[0]?.text.replace('\n', '')
  }
}

const unpairedTags = [
  '!doctype',
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr'
]

/** @type {XmlBuilderOptions} */
const options = { attributeNamePrefix: '', ignoreAttributes: false, preserveOrder: true, unpairedTags }
const builder = new XMLBuilder({ ...options, processEntities: false })
const parser = new XMLParser({ ...options, allowBooleanAttributes: true, tagValueProcessor })

/** @param {string} html */
function handler (html) {
  return builder.build(parser.parse(html))
}

/** @type {PluginOption} */
const htmlPlugin = { name: 'html', transformIndexHtml: { handler } }

export default htmlPlugin
