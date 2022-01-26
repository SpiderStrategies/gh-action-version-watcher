# Overview
A GitHub action that merges a single file containing the release version 
through a list of branches and resolves all conflicts using the strategy 'ours'

Example: 
- version `4.0.99` in branch `release-2021` is pushed.
- This creates a conflict in `release-2022` when the branches are merged.  The merge is resolved by applying whatever version already exists in `release-2022`

### Prerequisites
1. The workflow trigger must specify the version file so the actions only run for commits containing that file.
2. A reference must be specified to the Spider Merge Bot config, so that the branch lineage can be calculated.

### Assumptions
1. The primary use case for this action is to detect when we cut a new release which is defined as a human incrementing the version.properties file and then running a build.
2. The version will be bumped at the HEAD of the `release=-*` branch, not the `branch-here-release-*` branch.
3. As such, it's possible that merging this commit forward will introduce merges waiting on conflict resolution.  When this happens the merges must abort; The only file this action should resolve conflicts in is the version file.

#### Example usage
```yaml
on:
  push:
    branches: [release-2021-commercial-sp]
    paths:
      - cms/resource/version.properties
jobs:
  version-watcher:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: git show origin/sp:.spider-merge-bot-config.json > config.json
      - uses: SpiderStrategies/gh-action-version-watcher@master
        with:
          config-file: config.json
          version-file: cms/resource/version.properties
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

# Development

## One time setup

This uses [Nekos Act](https://github.com/nektos/act) and can be installed by running `brew install act`

### Steps to publish and test updates to this action.

1. Make the appropriate changes to the source (e.g. `index.js`)
2. Build the dist: `npm run build` (`npm install` if you haven't already)
3. Commit and push the changes
4. From a project that depends on this action you can run:
   - `act -j version-watcher -s GITHUB_TOKEN=$GHACTION_SECRET -e push-event.json`
   - This is an easy way to iterate over changes that require the entire workflow to run locally without having to rely on GitHub to run your action.  Just capture a real event to a local json file and pass it as the `-e` argument.

Note: we're not formally publishing a versioned action, so we can just refer to the `master` branch from other projects (e.g. `Scoreboard`)