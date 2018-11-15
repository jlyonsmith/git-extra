import parseArgs from "minimist"
import JSON5 from "json5"
import { fullVersion } from "./version"
import consul from "consul"
import flatten from "flat"
import autobind from "autobind-decorator"
import { promises as fs } from "fs"

@autobind
export class BitbucketTool {
  constructor(toolName, log) {
    this.toolName = toolName
    this.log = log
  }

  async run(argv) {
    const options = {
      string: [],
      boolean: ["help", "version", "debug"],
      alias: {},
      default: {},
    }

    this.args = parseArgs(argv, options)

    if (this.args.version) {
      this.log.info(`v${fullVersion}`)
      return 0
    }

    let command = this.args._[0]

    command = command ? command.toLowerCase() : "help"

    switch (command) {
      case "pull-request":
      case "prq":
        const subCommand = this.args._[1]

        if (this.args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} pull-request <options>

Description:

Create, modify, list or remove pull requests.
`)
          return 0
        }
        break

      case "help":
      default:
        this.log.info(`
BitBucket Tool

Usage: ${this.toolName} <command> ...

Provides command line BitBucket integration.

Commands:
  pull-request     Create, modify, list or remove pull requests

Global Options:
--help      Displays this help
--version   Displays tool version
--debug     Show debug output
`)
        return 0
    }

    return 0
  }
}
