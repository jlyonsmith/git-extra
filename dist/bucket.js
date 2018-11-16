#!/usr/bin/env node
"use strict";

var _BitbucketTool = require("./BitbucketTool");

var _chalk = _interopRequireDefault(require("chalk"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = {
  info: console.info,
  error: function () {
    console.error(_chalk.default.red("error:", [...arguments].join(" ")));
  },
  warning: function () {
    console.error(_chalk.default.yellow("warning:", [...arguments].join(" ")));
  }
};
const debug = process.argv.includes("--debug");
const tool = new _BitbucketTool.BitbucketTool(_path.default.basename(process.argv[1], ".js"), log);
tool.run(process.argv.slice(2)).then(exitCode => {
  process.exitCode = exitCode;
}).catch(error => {
  process.exitCode = 200;

  if (debug) {
    console.error(error);
  }

  log.error(error.message);
});
//# sourceMappingURL=bucket.js.map