// Node
const { exec } = require('child_process')

// Third-Party
// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

// Shared modules
const configReader = require('./config-reader')

// Inputs
const configFile = core.getInput('config-file', { required: true });
const versionFile = core.getInput('version-file', { required: true });
const dryRun = core.getInput('dry-run');

const context = github.context;
const { before, head_commit, ref } = context.payload

const baseBranch = ref.replace('refs/heads/', '')
core.info(`Base branch name '${baseBranch}' was extracted from ${ref}`)

const configData = configReader(configFile, { baseBranch })

async function execCmd(cmd) {
	if (dryRun) {
		core.info(`dry run: ${cmd}`)
	} else {
		core.info(`Running: ${cmd}`)
		const response = await exec(cmd)
		return response.toString().trim()
	}
}

async function runAction() {

	// Is it the only file changed?
	const filesChanged = await execCmd(`git diff ${before}...${head_commit.id} --name-only | wc 1`)
	if (filesChanged > 1) {
		core.warning("Multiple files detected in diff")
		return // Don't fail the action, just exit successfully
	}

	// Merge forward always keeping the latest branch's version
	const targets = configData.mergeTargets
	for await (const branch of targets) {
		await execCmd(`git checkout ${branch}`)
		// stage the changes
		await execCmd(`git merge ${head_commit.id} --no-commit`)
		// revert any changes to the version file
		await execCmd(`git checkout --ours ${versionFile}`)
		const conflicts = await execCmd(`git diff --name-only --diff-filter=U`)
		// Whoops, there are conflicts that require a human, abort
		if (conflicts.length > 0) {
			core.warning(`Conflicts found:\n`, conflicts)
			return
		}
	}
}

return runAction().catch(err => {
	core.error(err)
	core.setFailed(err)
})
