const test = require('node:test')
const assert = require('node:assert')
const VersionWatcher = require('./version-watcher')

class ActionStub extends VersionWatcher {

}

test('dies gracefully if running on a branch that was deleted', async t => {
  let action = new ActionStub({
    baseBranch: 'mock-branch',
  })

  assert.doesNotThrow(() => {
    action.runAction()
  })
})
