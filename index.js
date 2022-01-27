// Third-Party
// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

// Shared modules
const { configReader, BaseAction } = require('gh-action-components')

// Inputs
const configFile = core.getInput('config-file', { required: true });
const versionFile = core.getInput('version-file', { required: true });

const context = github.context;
const { before, head_commit, ref } = context.payload

const baseBranch = ref.replace('refs/heads/', '')
core.info(`Base branch name '${baseBranch}' was extracted from ${ref}`)

const configData = configReader(configFile, { baseBranch })


class VersionWatcherAction extends BaseAction {

	async runAction() {

		// Is it the only file changed?
		const filesChanged = await this.exec(`git diff ${before}...${head_commit.id} --name-only | wc -l`)
		if (filesChanged > 1) {
			core.warning("Multiple files detected in diff")
			return // Don't fail the action, just exit successfully
		}

		// Merge forward always keeping the latest branch's version
		const targets = configData.mergeTargets
		for await (const branch of targets) {
			await this.exec(`git checkout ${branch}`)
			// stage the changes
			await this.exec(`git merge ${head_commit.id} --no-commit`)
			// revert any changes to the version file
			await this.exec(`git checkout --ours ${versionFile}`)
			const conflicts = await this.exec(`git diff --name-only --diff-filter=U`)
			// Whoops, there are conflicts that require a human, abort
			if (conflicts && conflicts.length > 0) {
				core.warning(`Conflicts found:\n${conflicts}`)
				return
			}
		}
	}
}


return new VersionWatcherAction().run()

