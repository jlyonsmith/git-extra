import parseArgs from "minimist"
import { fullVersion } from "./version"
import autobind from "autobind-decorator"
import { promises as fs } from "fs"
import cp from "child_process"
import commandExists from "command-exists"
import stream from "stream"
import { promisify } from "util"
import opn from "opn"

function streamToString(readable) {
  if (!(readable instanceof stream.Readable)) {
    return readable.toString()
  }

  return new Promise((resolve, reject) => {
    let string = ""

    readable.on("readable", (buffer) => {
      string += buffer.read().toString()
    })

    readable.on("end", () => {
      resolve(string)
    })

    readable.on("error", (error) => {
      reject(error)
    })

    readable.pipe(writeable)
  })
}

const execAsync = promisify(cp.exec)

@autobind
export class BitbucketTool {
  constructor(toolName, log) {
    this.toolName = toolName
    this.log = log
  }

  async ensureCommands(cmds) {
    this.cmds = this.cmds || new Set()

    const newCmds = cmds.filter((cmd) => !this.cmds.has(cmd))
    const exists = await Promise.all(newCmds.map((cmd) => commandExists(cmd)))

    newCmds.forEach((cmd) => {
      if (!!exists[cmd]) {
        throw new Error(`Command '${cmd}' does not exist.  Please install it.`)
      } else {
        this.cmds.add(cmd)
      }
    })
  }

  async getRemotes() {
    await this.ensureCommands(["git"])

    const result = await execAsync("git remote -vv")
    const output = await streamToString(result.stdout)
    const re = new RegExp(
      "^(?<name>[a-zA-Z0-9-]+)\\s+git@(?<site>bitbucket\\.org|github\\.com):(?<user>[a-zA-Z0-9-]+)/(?<slug>[a-zA-Z0-9-]+).git\\s+\\(fetch\\)$",
      "gm"
    )

    let remotes = []
    let arr = null

    while ((arr = re.exec(output)) !== null) {
      const { name, site, user, slug } = arr.groups

      remotes.push({ name, site, user, slug })
    }

    return remotes
  }

  async browse(upstream) {
    const remotes = await this.getRemotes()

    for (const remote of remotes) {
      if (
        (upstream && remote.name.match(/upstream|official|parent/)) ||
        (!upstream && remote.name === "origin")
      ) {
        const url = `https://${remote.site}/${remote.user}/${remote.slug}`

        this.log.info(`Opening '${url}'...`)
        opn(url, { wait: false })
        return
      }
    }

    this.log.warning("No appropriate git remote was found")
  }

  async pullRequest() {
    // TODO: Implement pull request creation
    const remotes = await this.getRemotes()

    for (const remote of remotes) {
      if (remote.name === "origin") {
        const url = `https://${remote.site}/${remote.user}/${
          remote.slug
        }/pull-request/new`
        this.log.info(`Opening '${url}'...`)
        opn(url, { wait: false })
        return
      }
    }

    this.log.warning(
      "No appropriate git repository was found to create a PR for"
    )
  }

  async run(argv) {
    const options = {
      string: ["remote"],
      boolean: ["help", "version", "debug", "upstream"],
      alias: {
        u: "upstream",
      },
      default: {
        remote: "origin",
      },
    }

    const args = parseArgs(argv, options)

    if (args.version) {
      this.log.info(`v${fullVersion}`)
      return 0
    }

    let command = args._[0]

    command = command ? command.toLowerCase() : "help"

    const subCommand = args._[1]

    switch (command) {
      case "pull-request":
      case "prq": // TODO: Make configurable
        if (args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} pull-request <options>

Description:

Create a new pull requests.
`)
          return 0
        }

        await this.pullRequest()
        break

      case "browse":
      case "brw": // TODO: Make configurable
        if (args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} browse <options>

Description:

Browse to the current repository in your browser.

Options:

  --upstream, -u      Use the remote named 'upstream', 'parent' or 'official' to
                      open the upstream repository for a fork.
`)
          return 0
        }

        await this.browse(args.upstream)

        break

      case "help":
      default:
        this.log.info(`
Bitbucket Tool

Usage: ${this.toolName} <command> ...

Provides command line Bitbucket integration.

Commands:
  browse            Browse to the current or parent repository
  pull-request      Create, modify, list or remove pull requests

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
