// Third-Party
// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

// Shared modules
const { configReader } = require('gh-action-components')

// Inputs
const configFile = core.getInput('config-file', { required: true })
const versionFile = core.getInput('version-file', { required: true })
const dryRun = core.getInput('dry-run')

const context = github.context
const { before, head_commit, ref } = context.payload

const baseBranch = ref.replace('refs/heads/', '')
core.info(`Base branch name '${baseBranch}' was extracted from ${ref}`)

const configData = configReader(configFile, { baseBranch })

return new VersionWatcherAction({
	configData,
	baseBranch,
	before,
	head_commit,
	dryRun,
	versionFile,
}).run()
