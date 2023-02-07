const {  BaseAction } = require('gh-action-components')

class VersionWatcherAction extends BaseAction {

	constructor(options = {}) {
		super()
		this.options = options
	}

	async runAction() {

		try {
			await this.switchToBranch(this.options.baseBranch)
		} catch (e) {
			// The branch is no longer around. See https://github.com/SpiderStrategies/Scoreboard/issues/51812
			// Die gracefully
			return
		}

		// Is it the only file changed?
		const filesChanged = await this.exec(`git diff ${this.options.before}...${this.options.head_commit.id} --name-only | wc -l`)
		if (filesChanged > 1) {
			core.warning("Multiple files detected in diff")
			return // Don't fail the action, just exit successfully
		}

		if (!this.options.dryRun) {
			const username = `Version Watcher Bot`
			const userEmail = `version-watcher-bot@spiderstrategies.com`
			core.info(`Assigning git identity to ${username} <${userEmail}>`)
			await this.exec(`git config user.email "${userEmail}"`)
			await this.exec(`git config user.name "${username}"`)
		}

		// Merge forward always keeping the latest branch's version
		const targets = this.options.configData.mergeTargets

		let commitShaToMerge = this.options.head_commit.id
		for await (const branch of targets) {
			core.startGroup(`Merge into: ${branch}`)
			await this.switchToBranch(branch)
			// stage the changes
			try {
				const mergeOutput = await this.exec(`git merge ${commitShaToMerge} --no-commit -v`)
				core.info(mergeOutput)
			} catch (e) {
				// Don't know why this throws an error, but it's "expected"
				core.info(`Ignored: ${e}`)
				core.info(await this.exec(`git status`))
			}
			// revert any changes to the version file
			await this.exec(`git checkout --ours ${this.options.versionFile}`)
			await this.exec(`git add ${this.options.versionFile}`)

			// See if we still have conflicts remaining
			const conflicts = await this.exec(`git diff --name-only --diff-filter=U`)

			// Whoops, there are conflicts that require a human, abort
			if (conflicts && conflicts.length > 0) {
				core.warning(`Conflicts found:\n${conflicts}`)
				core.setFailed(`Version bump could not be auto merged because ` +
					`other conflicting changes exist between \`${this.options.baseBranch}\` and \`${branch}\`.  ` +
					`Someone will need to resolve the version.properties merge manually.`)
				core.endGroup()
				return
			}

			// Push the merge
			const versionSha = this.options.head_commit.id.substring(0,7)
			const msg = `merged ${this.options.baseBranch} (${versionSha}) version.properties bump into ${branch}`
			await this.exec(`git commit -m "${msg}"`)
			await this.exec(`git push`)

			// Get the new commit sha for the next merge
			commitShaToMerge = await this.exec(`git rev-parse HEAD`)

			// clean up index before moving on to next branch
			await this.exec(`git reset --hard`)
			core.endGroup()
		}
	}

	/**
	 * The checkout action doesn't get the full depth of a single branch.
	 * So we do it ourselves as needed
	 * https://github.com/SpiderStrategies/Scoreboard/issues/44243#issuecomment-1029052764
	 * @param branch
	 * @returns {Promise<void>}
	 */
	async switchToBranch(branch) {
		// --progress pollutes logs
		await this.exec(`git fetch --prune origin "+refs/heads/${branch}:refs/remotes/origin/${branch}"`)
		await this.exec(`git checkout --force -B ${branch} refs/remotes/origin/${branch}`)
		// const output = await this.exec(`git log -3 --pretty=format:"%h %d %s"`)
		// core.info(output)
	}
}

module.exports = VersionWatcherAction
