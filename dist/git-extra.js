#!/usr/bin/env node
"use strict";

var _GitExtraTool = require("./GitExtraTool");

var _path = _interopRequireDefault(require("path"));

var _Log = require("./Log");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = new _Log.Log();
const tool = new _GitExtraTool.GitExtraTool(_path.default.basename(process.argv[1], ".js"), log);
tool.run(process.argv.slice(2)).then(exitCode => {
  process.exitCode = exitCode;
}).catch(error => {
  process.exitCode = 200;

  if (tool.debug) {
    console.error(error);
  }

  log.error(error.message);
});
//# sourceMappingURL=git-extra.js.map