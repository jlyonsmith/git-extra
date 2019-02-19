# Extra Git Commands

A tool that creates some commands for working with BitBucket and GitHub that you can add to Git.

- `browse` - Opens a browser for the current repository and branch.
- `pull-request` - Opens a new pull-request.

To add these commands to Git, do `git config --global --edit` and insert:

```
[alias]
  ...
  browse = !git-extra browse
  pull-request = !git-extra pull-request
```
