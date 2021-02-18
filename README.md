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

### `git-extra-customize.js`

The following objects and methods are available:

| `async` | Method                               | Description                                                                 |
| ------- | ------------------------------------ | --------------------------------------------------------------------------- |
|         | `args.projectName`                   | The name of the project (the `path.basename()` of the directory)            |
|         | `args.userName`                      | The name of the currently logged in user                                    |
|         | `ui.log(message)`                    | Display a message to stdout                                                 |
| `async` | `fs.readFile(fileName)`              | Read a file from the project                                                |
| `async` | `fs.writeFile(fileName)`             | Write a file to the project                                                 |
| `async` | `fs.remove(pathName)`                | Remove a file or directory from the project                                 |
| `async` | `fs.move(fromPath, toPath)`          | Move a file or directory in the project                                     |
| `async` | `fs.ensureFile(fileName)`            | Ensure a file exists in the project, creating it if not                     |
| `async` | `fs.ensureDir(dirName)`              | Ensure a directory exists in the project, creating it if not                |
| `async` | `fs.inPlaceUpdate(fileName, array)`  | In-place-update a file with an array of search/replace strings. See below.  |
|         | `path.join(...pathNames)`            | Join a bunch of path parts                                                  |
|         | `path.dirname(pathName)`             | Get the directory part of a path                                            |
|         | `path.basename(pathName[, extName])` | Get the base part of path with any extension, remove `extName` if it exists |
|         | `path.extname(pathName)`             | Get the extension of a path                                                 |
| `async` | `git.forceAdd(fileName)`             | Force add a file to the Git repository                                      |
|         | `changeCase.camel(name)`             | Change the name to "camelCase"                                              |
|         | `changeCase.capital(name)`           | Change the name to "Capital Case"                                           |
|         | `changeCase.constant(name)`          | Change the name to "CONSTANT_CASE"                                          |
|         | `changeCase.dot(name)`               | Change the name to "dot.case"                                               |
|         | `changeCase.header(name)`            | Change the name to "Header-Case"                                            |
|         | `changeCase.word(name)`              | Change the name to "word case"                                              |
|         | `changeCase.param(name)`             | Change the name to "param-case"                                             |
|         | `changeCase.pascal(name)`            | Change the name to "PascalCase"                                             |
|         | `changeCase.path(name)`              | Change the name to "path/case"                                              |
|         | `changeCase.sentence(name)`          | Change the name to "Sentence case"                                          |
|         | `changeCase.snake(name)`             | Change the name to "snake_case"                                             |
| `async` | `ui.prompts(promptArray)`            | Display array of prompts. See below.                                        |
|         | `ui.log(message)`                    | Display a message to stdout                                                 |

`ui.prompts(...)` takes an array of:

```js
  [
    {
      name: string,
      initial: string, // Optional
      message: string,
      regex: string, // Optional
      error: string, // Optional
    }
  ]
```

`fs.inPlaceUpdate(...)` takes an array of arrays of search/replace pairs:

```js
 [
   [/something/, "anotherThing"],
 ]
```
