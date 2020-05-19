#!/usr/bin/env node
import { GitExtraTool } from "./GitExtraTool"
import path from "path"
import { Log } from "./Log"

const log = new Log()
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
