#!/usr/bin/env node
import { GitExtraTool } from "./GitExtraTool"
import path from "path"
import { ConsoleLogger } from "./Logger"

const log = new ConsoleLogger()
const tool = new GitExtraTool({
  toolName: path.basename(process.argv[1], ".js"),
  log,
})

tool
  .run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error) => {
    process.exitCode = 200

    if (error) {
      let message = error.message ?? ""

      if (tool.debug) {
        message += " (" + error.stack.substring(error.stack.indexOf("\n")) + ")"
      }

      log.error(message)
    }
  })
