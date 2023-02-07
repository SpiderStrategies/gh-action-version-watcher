const test = require('node:test')
const assert = require('node:assert')
const VersionWatcherAction = require('./version-watcher')

test('dies gracefully if running on a branch that was deleted', async t => {
	let action = new VersionWatcherAction({
		baseBranch: 'mock-branch',
	})

	assert.doesNotThrow(() => {
		action.runAction()
	})
})
