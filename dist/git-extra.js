#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GitExtraTool_1 = require("./GitExtraTool");
const path_1 = __importDefault(require("path"));
const Logger_1 = require("./Logger");
const log = new Logger_1.ConsoleLogger();
const tool = new GitExtraTool_1.GitExtraTool({
    toolName: path_1.default.basename(process.argv[1], ".js"),
    log,
});
tool
    .run(process.argv.slice(2))
    .then((exitCode) => {
    process.exitCode = exitCode;
})
    .catch((error) => {
    var _a;
    process.exitCode = 200;
    if (error) {
        let message = (_a = error.message) !== null && _a !== void 0 ? _a : "";
        if (tool.debug) {
            message += " (" + error.stack.substring(error.stack.indexOf("\n")) + ")";
        }
        log.error(message);
    }
});
//# sourceMappingURL=git-extra.js.map