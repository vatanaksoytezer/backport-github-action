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
const onlyRunOnMergedPrs = core.getBooleanInput('only_run_on_merged_prs', { required: false });

// Check if the PR is merged if the only_run_on_merged_prs is true
const isPrMerged = context.payload.pull_request && context.payload.pull_request.merged;
if (onlyRunOnMergedPrs && !isPrMerged) {
  core.info('Pull request is not merged. Action will not run.');
} else {
  run({
    context,
    inputs: {
      accessToken: core.getInput('github_token', {
        required: true,
      }),
      autoBackportLabelPrefix: core.getInput('auto_backport_label_prefix', {
        required: false,
      }),
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
        // if the failure message includes "There are no branches" then we don't want to fail the action
        if (failureMessage.includes('There are no branches')) {
          core.warning(failureMessage);
        }
        else {
          core.setFailed(failureMessage);
        }
      }
    })
    .catch((error) => {
      core.error(`Backport unable to be completed: ${error.message}`);
      core.setFailed(error.message);
    });
}
