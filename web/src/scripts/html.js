/** @param {Node} node */
function isCommentOrWhitespace(node) {
	return (
		node.nodeType === node.COMMENT_NODE ||
		(node.nodeType === node.TEXT_NODE && isWhitespace(node))
	)
}

/** @param {Node} node */
function isWhitespace(node) {
	return !!node.textContent && !/[^\t\n\r ]/.test(node.textContent)
}

/** @param {NodeListOf<ChildNode>} nodes */
export default function removeWhitespace(nodes) {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (!node) throw new Error('node does not exist')

		if (isCommentOrWhitespace(node)) {
			node.remove()
			i--

			continue
		}

		if (node.nodeType === node.TEXT_NODE) {
			const data = replaceWhitespace(node.textContent)

			if (data) node.replaceWith(data)
			else {
				node.remove()
				i--

				continue
			}
		}

		removeWhitespace(node.childNodes)
	}
}

/** @param {string | null} data */
function replaceWhitespace(data) {
	if (!data) return

	data = data.replace(/[\t\n\r ]+/g, ' ')
	if (data[0] === ' ') data = data.substring(1, data.length)
	if (data[data.length - 1] === ' ') data = data.substring(0, data.length - 1)

	return data
}
