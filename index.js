// Third-Party
// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

// Shared modules
const { configReader, BaseAction } = require('gh-action-components')

// Inputs
const configFile = core.getInput('config-file', { required: true });
const versionFile = core.getInput('version-file', { required: true });
const dryRun = core.getInput('dry-run');

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

		if (!dryRun) {
			const username = `Version Watcher Bot`
			const userEmail = `version-watcher-bot@spiderstrategies.com`
			core.info(`Assigning git identity to ${username} <${userEmail}>`)
			await this.exec(`git config user.email "${userEmail}"`)
			await this.exec(`git config user.name "${username}"`)
		}

		// Merge forward always keeping the latest branch's version
		const targets = configData.mergeTargets
		for await (const branch of targets) {
			await this.exec(`git checkout ${branch}`)
			await this.exec(`git pull`)
			// stage the changes
			await this.exec(`git merge ${head_commit.id} --no-commit`)
			// revert any changes to the version file
			await this.exec(`git checkout --ours ${versionFile}`)
			await this.exec(`git add ${versionFile}`)
			// See if we still have conflicts remaining
			const conflicts = await this.exec(`git diff --name-only --diff-filter=U`)
			// Whoops, there are conflicts that require a human, abort
			if (conflicts && conflicts.length > 0) {
				core.warning(`Conflicts found:\n${conflicts}`)
				return
			}
			// clean up index before moving on to next branch
			await this.exec(`git reset --hard`)

		}
	}
}


return new VersionWatcherAction().run()

