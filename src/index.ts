import * as core from '@actions/core';
import { context } from '@actions/github';
import { getFailureMessage, run } from './run';

// set environment for APM
process.env['NODE_ENV'] = 'production-github-action';

// Function to check if the PR contains the label with the given prefix
const hasAutoBackportLabel = (labels, prefix) => {
  return labels.some(label => label.name.startsWith(prefix));
};

// Retrieve inputs
const autoBackportLabelPrefix = core.getInput('auto_backport_label_prefix', { required: false });
const onlyRunOnMergedPrs = core.getBooleanInput('only_run_on_merged_prs', { required: false });
const prLabels = context.payload.pull_request ? context.payload.pull_request.labels : [];

// Check if the PR is merged if the only_run_on_merged_prs is true
const isPrMerged = context.payload.pull_request && context.payload.pull_request.merged;
if (onlyRunOnMergedPrs && !isPrMerged) {
  core.info('Pull request is not merged. Action will not run.');
} else if (autoBackportLabelPrefix && !hasAutoBackportLabel(prLabels, autoBackportLabelPrefix)) {
  core.info(`Pull request does not contain the label with prefix "${autoBackportLabelPrefix}". Action will not run.`);
} else {
  run({
    context,
    inputs: {
      accessToken: core.getInput('github_token', {
        required: true,
      }),
      autoBackportLabelPrefix,
      repoForkOwner: core.getInput('repo_fork_owner', {
        required: false,
      }),
      addOriginalReviewers: core.getBooleanInput('add_original_reviewers', {
        required: false,
      }),
    },
  })
    .then((res) => {
      core.info(`Backport result: ${res.status}`);
      core.setOutput('Result', res);
      const failureMessage = getFailureMessage(res);
      if (failureMessage) {
        core.setFailed(failureMessage);
      }
    })
    .catch((error) => {
      core.error(`Backport unable to be completed: ${error.message}`);
      core.setFailed(error.message);
    });
}
