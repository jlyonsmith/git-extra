import parseArgs from "minimist"
import { fullVersion } from "./version"
import * as childProcess from "promisify-child-process"
import commandExists from "command-exists"
import stream from "stream"
import open from "open"
import hostedGitInfo from "hosted-git-info"
import fs from "fs-extra"
import path from "path"
import vm from "vm"
import os from "os"
import * as changeCase from "change-case"
import prompts from "prompts"
import got from "got"
import JSON5 from "@johnls/json5"

function streamToString(readable) {
  if (!(readable instanceof stream.Readable)) {
    return readable.toString()
  }

  return new Promise((resolve, reject) => {
    let string = ""

    readable.on("readable", (buffer) => {
      let data

      while ((data = this.read())) {
        string += data.toString()
      }
    })

    readable.on("end", () => {
      resolve(string)
    })

    readable.on("error", (error) => {
      reject(error)
    })
  })
}

export class GitExtraTool {
  toolName: string
  log: any
  debug: boolean
  cmds: Set<string>

  constructor(options) {
    this.toolName = options.toolName
    this.log = options.log
    this.debug = options.debug
  }

  async ensureCommands(cmds) {
    this.cmds = this.cmds || new Set()

    const newCmds = cmds.filter((cmd) => !this.cmds.has(cmd))
    const exists = await Promise.all(newCmds.map((cmd) => commandExists(cmd)))

    newCmds.forEach((cmd) => {
      if (!!exists[cmd]) {
        throw new Error(`Command '${cmd}' does not exist. Please install it.`)
      } else {
        this.cmds.add(cmd)
      }
    })
  }

  async getRemotes() {
    const result = await childProcess.exec("git remote -vv")
    const output = await streamToString(result.stdout)
    const re = new RegExp(
      "^(?<name>[a-zA-Z0-9-]+)\\s+(?<url>.*)\\s+\\(fetch\\)$",
      "gm"
    )
    const remotes = {}
    let arr = null

    while ((arr = re.exec(output)) !== null) {
      const { name, url } = arr.groups

      remotes[name] = hostedGitInfo.fromUrl(url, { noGitPlus: true })
    }

    return remotes
  }

  async getBranch() {
    const result = await childProcess.exec("git rev-parse --abbrev-ref HEAD")
    let branch = streamToString(result.stdout).trim()

    if (branch === "HEAD") {
      branch = "master"
    }

    return branch
  }

  async browse(remoteName) {
    await this.ensureCommands(["git"])

    const remotes = await this.getRemotes()
    const branch = await this.getBranch()
    const remote = remotes[remoteName]

    if (!remote) {
      this.log.warning(`No git remote '${remote}' was found`)
      return
    }

    remote.committish = branch

    const url = remote.browse("")

    this.log.info(`Opening '${url}'...`)

    await open(url, { wait: false })
  }

  async pullRequest({ remoteName, upstreamRemoteName }) {
    await this.ensureCommands(["git"])

    const remotes = await this.getRemotes()
    const branch = await this.getBranch()
    const originRemote = remotes[remoteName]
    const upstreamRemote = remotes[upstreamRemoteName]

    if (!originRemote) {
      throw new Error(`Remote '${remoteName}' was not found`)
    }

    if (!upstreamRemote) {
      throw new Error(`Target remote '${upstreamRemoteName}' was not found`)
    }

    let url

    if (originRemote.domain === "github.com") {
      // On GitHub as of May 2020 you start a PR by do a compare operation from the upstream repository
      url = `https://${upstreamRemote.domain}/${upstreamRemote.user}/${upstreamRemote.project}/compare/${branch}...${originRemote.user}:${branch}`
    } else {
      // On BitBucket as of May 2020 you start a PR by doing a compare operation from the origin or upstream repository
      url = `https://${originRemote.domain}/${originRemote.user}/${originRemote.project}/pull-request/new`
    }

    this.log.info(`Opening '${url}'...`)
    await open(url, { wait: false })
  }

  async readCatalogFile() {
    // Read checking the ~/.git-extra/directory.json file
    const catalogFileName = path.join(
      process.env["HOME"],
      ".git-extra/catalog.json5"
    )

    await fs.ensureDir(path.dirname(catalogFileName))

    let content = null

    try {
      content = await fs.readFile(catalogFileName)
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error
      }
    }

    if (!content) {
      try {
        const { body } = await got(
          "https://raw.githubusercontent.com/jlyonsmith/git-extra/master/catalog.json5"
        )
        content = body
      } catch (error) {
        throw new Error(`Unable to GET catalog.json5. ${error.message}`)
      }

      await fs.writeFile(catalogFileName, content)
    }

    return JSON5.parse(content)
  }

  async quickStart(options) {
    await this.ensureCommands(["git", "node"])

    if (!options.url) {
      throw new Error("A repository URL a code must be given")
    }

    let dirName
    let repoLocation

    if (options.url.startsWith("file://")) {
      repoLocation = options.url.substring(7)
      dirName = options.dirName ?? path.basename(repoLocation)
    } else {
      const remote = hostedGitInfo.fromUrl(options.url, { noGitPlus: true })

      if (remote) {
        if (remote.default !== "https") {
          throw new Error("Only HTTPS templates URLs are supported")
        }

        // It's a valid hosted Git remote
        repoLocation = remote.toString()
        dirName = options.dirName ?? remote.project
      } else {
        // Not a hosted git URL
        const catalog = await this.readCatalogFile()

        repoLocation = catalog[options.url]?.url

        if (!repoLocation) {
          throw new Error(`'${options.url}' not found in catalog`)
        } else if (!repoLocation.startsWith("https://")) {
          throw new Error(`Catalog entry '${options.url}' must be HTTPS`)
        }

        dirName = options.dirName ?? options.url
      }
    }

    // Full qualify dirName so we can more easily use it to ensure
    // all customization script paths are under this directory.
    const fullDirName = path.resolve(dirName)

    if (options.overwrite) {
      await fs.remove(dirName)
    } else if (fs.pathExistsSync(dirName)) {
      throw new Error(
        `Directory '${fullDirName}' already exists; use --overwrite flag to replace`
      )
    }

    this.log.startSpinner(`Cloning ${repoLocation} into ${dirName}`)
    await childProcess.exec(`git clone ${repoLocation} ${dirName}`)
    this.log.stopSpinner()

    this.log.startSpinner(`Resetting repository history`)
    await fs.remove(path.join(dirName, ".git"))
    await childProcess.exec(`git init`, { cwd: dirName })
    await childProcess.exec(`git add -A :/`, { cwd: dirName })
    await childProcess.exec(`git commit -m 'Initial commit'`, { cwd: dirName })
    this.log.stopSpinner()

    let customizeScript

    try {
      customizeScript = await fs.readFile(
        path.join(dirName, "git-extra-customize.js"),
        {
          encoding: "utf8",
        }
      )
    } catch (error) {
      // No customization script found
      this.log.error(error.message)
      return
    }

    // Ensure all paths are under the project
    const qualifyPath = (pathName) => {
      const fullPathName = path.resolve(fullDirName, pathName)

      if (!fullPathName.startsWith(fullDirName)) {
        throw new Error(`Path ${pathName} not under ${dirName}`)
      }

      return fullPathName
    }

    this.log.startSpinner("Customizing project")

    const runContext = vm.createContext({
      args: {
        projectName: path.basename(dirName),
        userName: os.userInfo().username,
      },
      ui: {
        prompts: async (promptArray) => {
          this.log.stopSpinnerNoMessage()

          const safePrompts = promptArray.map((prompt) => ({
            type: "text",
            name: prompt.name.toString(),
            message: prompt.message.toString(),
            initial: prompt.initial,
            validate: (t) => new RegExp(prompt.regex).test(t) || prompt.error,
          }))

          const response = await prompts(safePrompts)

          this.log.restartSpinner()

          return response
        },
        log: (message) => console.log(message),
      },
      changeCase: {
        camel: changeCase.camelCase,
        proper: changeCase.capitalCase,
        constant: changeCase.constantCase,
        dot: changeCase.dotCase,
        header: changeCase.headerCase,
        word: changeCase.noCase,
        param: changeCase.paramCase,
        pascal: changeCase.pascalCase,
        path: changeCase.pathCase,
        sentence: changeCase.sentenceCase,
        snake: changeCase.snakeCase,
      },
      fs: {
        readFile: (fileName) =>
          fs.readFile(qualifyPath(fileName), { encoding: "utf8" }),
        writeFile: (fileName, contents) =>
          fs.writeFile(qualifyPath(fileName), contents),
        remove: (pathName) => fs.remove(qualifyPath(pathName)),
        move: (fromFileName, toFileName) =>
          fs.move(qualifyPath(fromFileName), qualifyPath(toFileName)),
        ensureFile: (fileName) => fs.ensureFile(qualifyPath(fileName)),
        ensureDir: (dirName) => fs.ensureDir(qualifyPath(dirName)),
        inPlaceUpdate: async (fileName, replacements) => {
          const safeFileName = qualifyPath(fileName)
          let content = await fs.readFile(safeFileName, { encoding: "utf8" })

          for (const [searchValue, replaceValue] of replacements) {
            content = content.replace(searchValue, replaceValue)
          }

          await fs.writeFile(safeFileName, content)
        },
      },
      path: {
        join: (...pathNames) => path.join(...pathNames),
        dirname: (pathName) => path.dirname(pathName),
        basename: (pathName, ext) => path.basename(pathName, ext),
        extname: (pathName) => path.extname(pathName),
      },
      git: {
        forceAdd: async (fileName) =>
          childProcess.exec(`git add -f ${qualifyPath(fileName)}`, {
            cwd: dirName,
          }),
      },
    })

    try {
      await new vm.Script(
        "(async () => {" + customizeScript + "\n})()"
      ).runInContext(runContext)
    } catch (error) {
      this.log.stopSpinnerNoMessage()
      if (this.debug) {
        throw error
      } else {
        throw new Error(`Customization script error. ${error.message}`)
      }
    }

    await fs.remove(path.join(dirName, "git-extra-customize.js"))
    await childProcess.exec("git add -A :/", { cwd: dirName })
    await childProcess.exec("git commit -m 'After customization'", {
      cwd: dirName,
    })

    this.log.stopSpinner()
  }

  async quickStartList() {
    const catalog = await this.readCatalogFile()

    const width = Math.max(...Object.keys(catalog).map((k) => k.length)) + 2

    for (const key of Object.keys(catalog)) {
      const entry = catalog[key]

      this.log.info(
        `${key.padEnd(width)}${entry.description}\n${"".padEnd(width)}${
          entry.url
        }`
      )
    }
  }

  async run(argv) {
    const options = {
      string: ["remote", "to-remote"],
      boolean: ["help", "version", "debug", "overwrite", "list"],
      alias: {
        r: "remote",
        t: "to-remote",
        l: "list",
      },
      default: {
        remote: "origin",
        toRemote: "upstream",
      },
    }

    const args = parseArgs(argv, options)

    this.debug = args.debug

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
          this.log.info(`Usage: ${this.toolName} pull-request [<options>]

Description:

Create a new pull request.

Options:
--remote, -r <remote>     Remote to use as source. Default is 'origin'.
--to-remote, -t <remote>  Remote to use as destination. Default is 'upstream'.
`)
          return 0
        }

        await this.pullRequest({
          remoteName: args.remote,
          upstreamRemoteName: args.toRemote,
        })
        break

      case "browse":
      case "brw": // TODO: Make configurable
        if (args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} browse [<options>]

Description:

Browse to the current repository in your browser.

Options:
  --remote, -r <remote>   Use the given remote. Default is 'origin'.
`)
          return 0
        }

        await this.browse(args.remote)

        break

      case "qst":
      case "quick-start":
        if (args.help && !subCommand) {
          this.log.info(
            `Usage:
  ${this.toolName} quick-start [--overwrite] [<catalog-id> | file://<dir> | <hosted-git-url>] [<target-dir>]
  ${this.toolName} quick-start [--list | -l]

Description:

Quickly start a project by doing a bare clone of an existing repository, then
running the 'git-extra-customize.js' customization script if there is one.

Options:
  --overwrite   Overwrite any existing project
  --list, -l    List available projects with their project codes in from '~/.git-extra/catalog.json5'
                If the file does not exist it will be created by copying down
                https://raw.githubusercontent.com/jlyonsmith/git-extra/master/catalog.json5
`
          )
          return 0
        }

        if (args.list) {
          await this.quickStartList()
        } else {
          await this.quickStart({
            url: args._[1],
            dirName: args._[2],
            overwrite: args.overwrite,
          })
        }
        break

      case "help":
      default:
        this.log.info(`
Git Extra Tool

Usage: ${this.toolName} <command> ...

Provides extra commands to support Git repos on GitHub, BitBucket and GitLab.

Commands:
  browse            Browse to a remote repository
  pull-request      Create a new pull request from a forked repository
  quick-start       Quickly start a new project from an existing repository

Global Options:
  --help                  Displays this help
  --version               Displays tool version
  --debug                 Show debug output
`)
        return 0
    }

    return 0
  }
}
