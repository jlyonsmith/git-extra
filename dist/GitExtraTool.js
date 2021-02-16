"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitExtraTool = void 0;
const minimist_1 = __importDefault(require("minimist"));
const version_1 = require("./version");
const childProcess = __importStar(require("promisify-child-process"));
const command_exists_1 = __importDefault(require("command-exists"));
const stream_1 = __importDefault(require("stream"));
const open_1 = __importDefault(require("open"));
const hosted_git_info_1 = __importDefault(require("hosted-git-info"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const vm_1 = __importDefault(require("vm"));
const os_1 = __importDefault(require("os"));
const changeCase = __importStar(require("change-case"));
const prompts_1 = __importDefault(require("prompts"));
const got_1 = __importDefault(require("got"));
const json5_1 = __importDefault(require("@johnls/json5"));
function streamToString(readable) {
    if (!(readable instanceof stream_1.default.Readable)) {
        return readable.toString();
    }
    return new Promise((resolve, reject) => {
        let string = "";
        readable.on("readable", (buffer) => {
            let data;
            while ((data = this.read())) {
                string += data.toString();
            }
        });
        readable.on("end", () => {
            resolve(string);
        });
        readable.on("error", (error) => {
            reject(error);
        });
    });
}
class GitExtraTool {
    constructor(options) {
        this.toolName = options.toolName;
        this.log = options.log;
        this.debug = options.debug;
    }
    ensureCommands(cmds) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cmds = this.cmds || new Set();
            const newCmds = cmds.filter((cmd) => !this.cmds.has(cmd));
            const exists = yield Promise.all(newCmds.map((cmd) => command_exists_1.default(cmd)));
            newCmds.forEach((cmd) => {
                if (!!exists[cmd]) {
                    throw new Error(`Command '${cmd}' does not exist. Please install it.`);
                }
                else {
                    this.cmds.add(cmd);
                }
            });
        });
    }
    getRemotes() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield childProcess.exec("git remote -vv");
            const output = yield streamToString(result.stdout);
            const re = new RegExp("^(?<name>[a-zA-Z0-9-]+)\\s+(?<url>.*)\\s+\\(fetch\\)$", "gm");
            const remotes = {};
            let arr = null;
            while ((arr = re.exec(output)) !== null) {
                const { name, url } = arr.groups;
                remotes[name] = hosted_git_info_1.default.fromUrl(url, { noGitPlus: true });
            }
            return remotes;
        });
    }
    getBranch() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield childProcess.exec("git rev-parse --abbrev-ref HEAD");
            let branch = streamToString(result.stdout).trim();
            if (branch === "HEAD") {
                branch = "master";
            }
            return branch;
        });
    }
    browse(remoteName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureCommands(["git"]);
            const remotes = yield this.getRemotes();
            const branch = yield this.getBranch();
            const remote = remotes[remoteName];
            if (!remote) {
                this.log.warning(`No git remote '${remote}' was found`);
                return;
            }
            remote.committish = branch;
            const url = remote.browse("");
            this.log.info(`Opening '${url}'...`);
            yield open_1.default(url, { wait: false });
        });
    }
    pullRequest({ remoteName, upstreamRemoteName }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureCommands(["git"]);
            const remotes = yield this.getRemotes();
            const branch = yield this.getBranch();
            const originRemote = remotes[remoteName];
            const upstreamRemote = remotes[upstreamRemoteName];
            if (!originRemote) {
                throw new Error(`Remote '${remoteName}' was not found`);
            }
            if (!upstreamRemote) {
                throw new Error(`Target remote '${upstreamRemoteName}' was not found`);
            }
            let url;
            if (originRemote.domain === "github.com") {
                // On GitHub as of May 2020 you start a PR by do a compare operation from the upstream repository
                url = `https://${upstreamRemote.domain}/${upstreamRemote.user}/${upstreamRemote.project}/compare/${branch}...${originRemote.user}:${branch}`;
            }
            else {
                // On BitBucket as of May 2020 you start a PR by doing a compare operation from the origin or upstream repository
                url = `https://${originRemote.domain}/${originRemote.user}/${originRemote.project}/pull-request/new`;
            }
            this.log.info(`Opening '${url}'...`);
            yield open_1.default(url, { wait: false });
        });
    }
    readCatalogFile() {
        return __awaiter(this, void 0, void 0, function* () {
            // Read checking the ~/.git-extra/directory.json file
            const catalogFileName = path_1.default.join(process.env["HOME"], ".git-extra/catalog.json5");
            yield fs_extra_1.default.ensureDir(path_1.default.dirname(catalogFileName));
            let content = null;
            try {
                content = yield fs_extra_1.default.readFile(catalogFileName);
            }
            catch (error) {
                if (error.code !== "ENOENT") {
                    throw error;
                }
            }
            if (!content) {
                try {
                    const { body } = yield got_1.default("https://raw.githubusercontent.com/jlyonsmith/git-extra/master/catalog.json5");
                    content = body;
                }
                catch (error) {
                    throw new Error(`Unable to GET catalog.json5. ${error.message}`);
                }
                yield fs_extra_1.default.writeFile(catalogFileName, content);
            }
            return json5_1.default.parse(content);
        });
    }
    quickStart(options) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureCommands(["git", "node"]);
            if (!options.url) {
                throw new Error("A repository URL a code must be given");
            }
            let dirName;
            let repoLocation;
            if (options.url.startsWith("file://")) {
                repoLocation = options.url.substring(7);
                dirName = (_a = options.dirName) !== null && _a !== void 0 ? _a : path_1.default.basename(repoLocation);
            }
            else {
                const remote = hosted_git_info_1.default.fromUrl(options.url, { noGitPlus: true });
                if (remote) {
                    // It's a valid hosted git remote
                    repoLocation = remote.toString();
                    dirName = (_b = options.dirName) !== null && _b !== void 0 ? _b : remote.project;
                }
                else {
                    // Not a hosted git URL
                    const catalog = yield this.readCatalogFile();
                    repoLocation = (_c = catalog[options.url]) === null || _c === void 0 ? void 0 : _c.url;
                    if (!repoLocation) {
                        throw new Error(`'${options.url}' not fount in catalog`);
                    }
                    dirName = (_d = options.dirName) !== null && _d !== void 0 ? _d : options.url;
                }
            }
            // Full qualify dirName so we can more easily use it to ensure
            // all customization script paths are under this directory.
            const fullDirName = path_1.default.resolve(dirName);
            if (options.overwrite) {
                yield fs_extra_1.default.remove(dirName);
            }
            else if (fs_extra_1.default.pathExistsSync(dirName)) {
                throw new Error(`Directory '${fullDirName}' already exists; use --overwrite flag to replace`);
            }
            this.log.startSpinner(`Cloning ${repoLocation} into ${dirName}`);
            yield childProcess.exec(`git clone ${repoLocation} ${dirName}`);
            this.log.stopSpinner();
            this.log.startSpinner(`Resetting repository history`);
            yield fs_extra_1.default.remove(path_1.default.join(dirName, ".git"));
            yield childProcess.exec(`git init`, { cwd: dirName });
            yield childProcess.exec(`git add -A :/`, { cwd: dirName });
            yield childProcess.exec(`git commit -m 'Initial commit'`, { cwd: dirName });
            this.log.stopSpinner();
            let customizeScript;
            try {
                customizeScript = yield fs_extra_1.default.readFile(path_1.default.join(dirName, "git-extra-customize.js"), {
                    encoding: "utf8",
                });
            }
            catch (error) {
                // No customization script found
                this.log.error(error.message);
                return;
            }
            const qualifyPath = (pathName) => {
                const fullPathName = path_1.default.resolve(fullDirName, pathName);
                if (!fullPathName.startsWith(fullDirName)) {
                    throw new Error(`Path ${pathName} not under ${dirName}`);
                }
                return fullPathName;
            };
            this.log.startSpinner("Customizing project");
            const runContext = vm_1.default.createContext({
                args: {
                    projectName: path_1.default.basename(dirName),
                    userName: os_1.default.userInfo().username,
                },
                ui: {
                    prompts: (promptArray) => __awaiter(this, void 0, void 0, function* () {
                        this.log.stopSpinnerNoMessage();
                        const safePrompts = promptArray.map((prompt) => ({
                            type: "text",
                            name: prompt.name.toString(),
                            message: prompt.message.toString(),
                            initial: prompt.initial,
                            validate: (t) => new RegExp(prompt.regex).test(t) || prompt.error,
                        }));
                        const response = yield prompts_1.default(safePrompts);
                        this.log.restartSpinner();
                        return response;
                    }),
                    log: (message) => console.log(message),
                },
                changeCase: {
                    pascal: changeCase.pascalCase,
                },
                fs: {
                    readFile: (fileName) => fs_extra_1.default.readFile(qualifyPath(fileName), { encoding: "utf8" }),
                    writeFile: (fileName, contents) => fs_extra_1.default.writeFile(qualifyPath(fileName), contents),
                    remove: (pathName) => fs_extra_1.default.remove(qualifyPath(pathName)),
                    move: (fromFileName, toFileName) => fs_extra_1.default.move(qualifyPath(fromFileName), qualifyPath(toFileName)),
                    ensureFile: (fileName) => fs_extra_1.default.ensureFile(qualifyPath(fileName)),
                    mkdir: (dirName) => fs_extra_1.default.mkdirp(qualifyPath(dirName)),
                },
                path: {
                    join: (...pathNames) => path_1.default.join(...pathNames),
                    dirname: (pathName) => path_1.default.dirname(pathName),
                    basename: (pathName, ext) => path_1.default.basename(pathName, ext),
                    extname: (pathName) => path_1.default.extname(pathName),
                },
                git: {
                    forceAdd: (fileName) => __awaiter(this, void 0, void 0, function* () {
                        return childProcess.exec(`git add -f ${qualifyPath(fileName)}`, {
                            cwd: dirName,
                        });
                    }),
                },
            });
            try {
                yield new vm_1.default.Script("(async () => {" + customizeScript + "\n})()").runInContext(runContext);
            }
            catch (error) {
                this.log.stopSpinnerNoMessage();
                if (this.debug) {
                    throw error;
                }
                else {
                    throw new Error(`Customization script error. ${error.message}`);
                }
            }
            yield fs_extra_1.default.remove(path_1.default.join(dirName, "git-extra-customize.js"));
            yield childProcess.exec("git add -A :/", { cwd: dirName });
            yield childProcess.exec("git commit -m 'After customization'", {
                cwd: dirName,
            });
            this.log.stopSpinner();
        });
    }
    quickStartList() {
        return __awaiter(this, void 0, void 0, function* () {
            const catalog = yield this.readCatalogFile();
            const width = Math.max(...Object.keys(catalog).map((k) => k.length)) + 2;
            for (const key of Object.keys(catalog)) {
                const entry = catalog[key];
                this.log.info(`${key.padEnd(width)}${entry.description}\n${"".padEnd(width)}${entry.url}`);
            }
        });
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
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
            };
            const args = minimist_1.default(argv, options);
            this.debug = args.debug;
            if (args.version) {
                this.log.info(`v${version_1.fullVersion}`);
                return 0;
            }
            let command = args._[0];
            command = command ? command.toLowerCase() : "help";
            const subCommand = args._[1];
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
`);
                        return 0;
                    }
                    yield this.pullRequest({
                        remoteName: args.remote,
                        upstreamRemoteName: args.toRemote,
                    });
                    break;
                case "browse":
                case "brw": // TODO: Make configurable
                    if (args.help && !subCommand) {
                        this.log.info(`Usage: ${this.toolName} browse [<options>]

Description:

Browse to the current repository in your browser.

Options:
  --remote, -r <remote>   Use the given remote. Default is 'origin'.
`);
                        return 0;
                    }
                    yield this.browse(args.remote);
                    break;
                case "qst":
                case "quick-start":
                    if (args.help && !subCommand) {
                        this.log.info(`Usage:
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
`);
                        return 0;
                    }
                    if (args.list) {
                        yield this.quickStartList();
                    }
                    else {
                        yield this.quickStart({
                            url: args._[1],
                            dirName: args._[2],
                            overwrite: args.overwrite,
                        });
                    }
                    break;
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
`);
                    return 0;
            }
            return 0;
        });
    }
}
exports.GitExtraTool = GitExtraTool;
//# sourceMappingURL=GitExtraTool.js.map