# Self-Healing Workflow System

This repository implements a self-healing workflow system that automatically analyzes and reports workflow failures.

## Overview

When a workflow fails, the system automatically:

1. Analyzes the failure logs
2. Classifies the failure as transient or persistent
3. Creates a GitHub issue if the failure is deemed persistent
4. Tags the issue with `ci-failure` and `automated` labels
5. Mentions @github (Copilot) in the issue for automated assistance

## Implementation

The system consists of three main components:

### 1. Failure Analysis Workflow (failure-analysis.yml)

A reusable workflow that can be called from other workflows when they fail. It:

- Fetches the failed job logs
- Analyzes the logs to classify the failure
- Creates or updates GitHub issues for persistent failures

### 2. Test Workflow Integration (test.yml)

The test workflow includes an `analyze-failure` job that:

- Runs only when the `test` job fails
- Calls the failure analysis workflow
- Passes the workflow and job name for context

### 3. Lint Workflow Integration (lint.yml)

The lint workflow includes an `analyze-failure` job that:

- Runs only when the `format-and-lint` job fails
- Calls the failure analysis workflow
- Passes the workflow and job name for context

## Failure Classification

The system classifies failures into two categories:

### Transient Failures

These are temporary issues that may resolve themselves on retry:

- Network errors (ECONNREFUSED, ETIMEDOUT)
- Timeout errors
- Rate limit errors
- Service unavailability (503, 502)

### Persistent Failures

These are code-related issues that require developer attention:

- Test failures
- Assertion failures
- Type errors
- Syntax errors
- Module not found errors
- Lint errors
- Format errors

## Issue Management

When a persistent failure is detected:

1. The system checks for existing open issues with the same workflow and job name
2. If an issue exists, it adds a comment with the new failure details
3. If no issue exists, it creates a new issue with:
   - A descriptive title
   - Full failure details
   - Links to the workflow run
   - Log excerpts
   - @github mention for Copilot assistance

## Permissions

The workflows require the following permissions:

- `contents: read` - To checkout the repository
- `issues: write` - To create and update issues

## Security

The failure analysis only runs on pull requests from the same repository (not forks) to prevent security issues.

## Usage

The system is automatically triggered when workflows fail. No manual intervention is required.

To view failure analysis results:

1. Check the "Actions" tab in GitHub
2. Look for the "analyze-failure" job in failed workflow runs
3. Check the "Issues" tab for automatically created failure reports

## Customization

To add failure analysis to additional workflows:

1. Add the `issues: write` permission to the workflow
2. Add an `analyze-failure` job that calls the failure analysis workflow
3. Pass the appropriate `workflow_name` and `job_name` parameters

Example:

```yaml
analyze-failure:
  needs: your-job-name
  if: failure()
  uses: ./.github/workflows/failure-analysis.yml
  with:
    workflow_name: 'Your Workflow Name'
    job_name: 'your-job-name'
  secrets:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

If the failure analysis doesn't run:

1. Verify that the `issues: write` permission is set
2. Ensure the workflow is running on a PR from the same repository
3. Check that the `analyze-failure` job has the correct `needs` dependency
4. Review the workflow logs for any errors

## Future Enhancements

Potential improvements to the system:

- Integration with GitHub Copilot AI for automated fix suggestions
- Retry logic for transient failures
- Enhanced failure pattern detection
- Slack/email notifications for critical failures
- Historical failure analysis and trends
