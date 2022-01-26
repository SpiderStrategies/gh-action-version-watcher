const { readFileSync } = require('fs')

/**
 * @typedef Configuration
 *
 * @property {Object} config The config object as it was provided
 *
 * @property {Array<String>} mergeTargets An ordered array of branches that a
 * change should be merged forward into. (e.g. releases in chronological order)
 *
 * @property {Object} branchNameByMilestoneNumber e.g. { 1: 'release-2022' }
 */

/**
 * Reads the config file and (re)structures data in useful ways.
 *
 * @param configFileLocation
 * @param {String} options.baseBranch
 *
 * @returns {Configuration}
 */
function configReader(configFileLocation, options = {}) {
	const config = JSON.parse(readFileSync(configFileLocation))

	const data = {
		mergeTargets: buildMergeTargets(config, options),
		branchNameByMilestoneNumber: branchNameByMilestone(config)
	}

	return {
		config,
		...data
	}
}

function buildMergeTargets(config, options) {
	const mergeTargets = []
	const {mergeOperations} = config
	let branchTarget = mergeOperations[options.baseBranch || 0]
	while (branchTarget) {
		mergeTargets.push(branchTarget)
		branchTarget = mergeOperations[branchTarget]
	}

	return mergeTargets
}

/**
 * Get a mapping of milestonNumber to the release branch the milestone is assigned to.
 *
 * @param {Object} config.branches
 * "branches": {
 *     "release-2020-commercial": {
 *       "alias": "2020",
 *       "milestoneNumber": 1
 *     },
 *     ...
 * }
 *
 * @returns {Object}
 * {
 *     1: "release-2020-commercial"
 * }
 */
function branchNameByMilestone(config) {
	const returnValue = {}
	Object.entries(config.branches).forEach(entry => {
		const [branchName, props] = entry;
		const { milestoneNumber } = props
		returnValue[milestoneNumber] = branchName
	})
	return returnValue
}


module.exports = configReader