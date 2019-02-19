#!/usr/bin/env node
import { GitExtraTool } from "./GitExtraTool"
import chalk from "chalk"
import path from "path"

const log = {
  info: console.info,
  error: function() {
    console.error(chalk.red("error:", [...arguments].join(" ")))
  },
  warning: function() {
    console.error(chalk.yellow("warning:", [...arguments].join(" ")))
  },
}

const tool = new GitExtraTool(path.basename(process.argv[1], ".js"), log)

tool
  .run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error) => {
    process.exitCode = 200
    if (tool.debug) {
      console.error(error)
    }
    log.error(error.message)
  })
