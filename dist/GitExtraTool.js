"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GitExtraTool = void 0;

var _minimist = _interopRequireDefault(require("minimist"));

var _version = require("./version");

var _autobindDecorator = _interopRequireDefault(require("autobind-decorator"));

var _child_process = _interopRequireDefault(require("child_process"));

var _commandExists = _interopRequireDefault(require("command-exists"));

var _stream = _interopRequireDefault(require("stream"));

var _util = require("util");

var _open = _interopRequireDefault(require("open"));

var _class;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function streamToString(readable) {
  if (!(readable instanceof _stream.default.Readable)) {
    return readable.toString();
  }

  return new Promise((resolve, reject) => {
    let string = "";
    readable.on("readable", buffer => {
      string += buffer.read().toString();
    });
    readable.on("end", () => {
      resolve(string);
    });
    readable.on("error", error => {
      reject(error);
    });
    readable.pipe(writeable);
  });
}

const execAsync = (0, _util.promisify)(_child_process.default.exec);

let GitExtraTool = (0, _autobindDecorator.default)(_class = class GitExtraTool {
  constructor(toolName, log) {
    const options = typeof toolName === "object" ? toolName : null;

    if (options) {
      this.toolName = options.toolName;
      this.log = options.log;
      this.debug = options.debug;
    } else {
      this.toolName = toolName;
      this.log = log;
    }
  }

  async ensureCommands(cmds) {
    this.cmds = this.cmds || new Set();
    const newCmds = cmds.filter(cmd => !this.cmds.has(cmd));
    const exists = await Promise.all(newCmds.map(cmd => (0, _commandExists.default)(cmd)));
    newCmds.forEach(cmd => {
      if (!!exists[cmd]) {
        throw new Error(`Command '${cmd}' does not exist.  Please install it.`);
      } else {
        this.cmds.add(cmd);
      }
    });
  }

  async getRemotes() {
    await this.ensureCommands(["git"]);
    const result = await execAsync("git remote -vv");
    const output = await streamToString(result.stdout);
    const re = new RegExp("^(?<name>[a-zA-Z0-9-]+)\\s+git@(?<site>bitbucket\\.org|github\\.com):(?<user>[a-zA-Z0-9-]+)/(?<slug>[a-zA-Z0-9-]+).git\\s+\\(fetch\\)$", "gm");
    let remotes = [];
    let arr = null;

    while ((arr = re.exec(output)) !== null) {
      const {
        name,
        site,
        user,
        slug
      } = arr.groups;
      remotes.push({
        name,
        site,
        user,
        slug
      });
    }

    return remotes;
  }

  async getBranch() {
    const result = await execAsync("git rev-parse --abbrev-ref HEAD");
    const branch = streamToString(result.stdout).trim();

    if (branch === "HEAD") {
      branch = "master";
    }

    return branch;
  }

  async browse(remoteName) {
    const remotes = await this.getRemotes();
    const branch = await this.getBranch();

    for (const remote of remotes) {
      if (remote.name === remoteName) {
        const isGitHub = remote.site === "github.com";
        let url = `https://${remote.site}/${remote.user}/${remote.slug}/`;

        if (isGitHub) {
          url += `tree/${branch}`;
        } else {
          url += `src?at=${branch}`;
        }

        this.log.info(`Opening '${url}'...`);
        (0, _open.default)(url, {
          wait: false
        });
        return;
      }
    }

    this.log.warning(`No git remote '${remote}' was found`);
  }

  async pullRequest({
    remoteName,
    upstreamRemoteName
  }) {
    const remotes = await this.getRemotes();
    const branch = await this.getBranch();
    const originRemote = remotes.find(remote => remote.name === remoteName);
    const upstreamRemote = remotes.find(remote => remote.name === upstreamRemoteName);

    if (!originRemote) {
      this.log.error(`Remote '${remoteName}' was not found`);
      return;
    }

    if (!upstreamRemote) {
      this.log.error(`Target remote '${upstreamRemoteName}' was not found`);
      return;
    }

    let url;

    if (originRemote.site === "github.com") {
      // On GitHub as of May 2020 you start a PR by do a compare operation from the upstream repository
      url = `https://${upstreamRemote.site}/${upstreamRemote.user}/${upstreamRemote.slug}/compare/${branch}...${originRemote.user}:${branch}`;
    } else {
      // On BitBucket as of May 2020 you start a PR by doing a compare operation from the origin or upstream repository
      url = `https://${originRemote.site}/${originRemote.user}/${originRemote.slug}/pull-request/new`;
    }

    this.log.info(`Opening '${url}'...`);
    (0, _open.default)(url, {
      wait: false
    });
  }

  async run(argv) {
    const options = {
      string: ["remote", "to-remote"],
      boolean: ["help", "version", "debug"],
      alias: {
        r: "remote",
        t: "to-remote"
      },
      default: {
        remote: "origin",
        toRemote: "upstream"
      }
    };
    const args = (0, _minimist.default)(argv, options);
    this.debug = args.debug;

    if (args.version) {
      this.log.info(`v${_version.fullVersion}`);
      return 0;
    }

    let command = args._[0];
    command = command ? command.toLowerCase() : "help";
    const subCommand = args._[1];

    switch (command) {
      case "pull-request":
      case "prq":
        // TODO: Make configurable
        if (args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} pull-request <options>

Description:

Create a new pull request.

Options:
--remote, -r <remote>     Remote to use as source. Default is 'origin'.
--to-remote, -t <remote>  Remote to use as destination. Default is 'upstream'.
`);
          return 0;
        }

        await this.pullRequest({
          remoteName: args.remote,
          upstreamRemoteName: args.toRemote
        });
        break;

      case "browse":
      case "brw":
        // TODO: Make configurable
        if (args.help && !subCommand) {
          this.log.info(`Usage: ${this.toolName} browse <options>

Description:

Browse to the current repository in your browser.

Options:
  --remote, -r <remote>   Use the given remote. Default is 'origin'.
`);
          return 0;
        }

        await this.browse(args.remote);
        break;

      case "help":
      default:
        this.log.info(`
Bitbucket Tool

Usage: ${this.toolName} <command> ...

Provides simple command line GitHub and BitBucket integrations.

Commands:
  browse            Browse to a remote repository
  pull-request      Create a new pull request from a forked repository

Global Options:
  --help                  Displays this help
  --version               Displays tool version
  --debug                 Show debug output
`);
        return 0;
    }

    return 0;
  }

}) || _class;

exports.GitExtraTool = GitExtraTool;
//# sourceMappingURL=GitExtraTool.js.map