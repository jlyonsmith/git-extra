# Extra Git Commands

A tool that creates some commands for working with BitBucket and GitHub that you can add to Git.

- `browse` - Opens a browser for the current repository and branch.
- `pull-request` - Opens a new pull-request.
- `quick-start` - Quickly starts a new project by copying and customizing an existing repository.

To add these commands to Git, do `git config --global --edit` and insert:

```sh
[alias]
  ...
  browse = !git-extra browse
  pull-request = !git-extra pull-request
  quick-start = !git-extra quick-start
```

## Quick Start

By default `quick-start` copies an existing repository by cloning it and then resets the Git history.

The power of `quick-start` is that you can customize the project after the initial clone.  To enable this, create a `git-extra-customize.js` file in the root of the project.  This file contains a Javascript program that is run after the initial clone which can change the contents of the files, changing names, creating files and directories, etc..  The script is run in a VM so it can only do a restricted set of things.  See the [GitExtraTool.js](./src/GitExtraTool.js) for the full list of functions available.
