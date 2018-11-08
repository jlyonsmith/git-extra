#!/usr/bin/env node
import { BitBucketTool } from "./BitBucketTool"
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

const debug = process.argv.includes("--debug")
const tool = new BitBucketTool(path.basename(process.argv[1], ".js"), log)

tool
  .run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error) => {
    process.exitCode = 200
    if (debug) {
      console.error(error)
    }
    log.error(error.message)
  })
