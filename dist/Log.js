"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Log = void 0;

var _readline = _interopRequireDefault(require("readline"));

var _chalk = _interopRequireDefault(require("chalk"));

var _autobindDecorator = _interopRequireDefault(require("autobind-decorator"));

var _os = _interopRequireDefault(require("os"));

var _class, _class2, _temp;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let Log = (0, _autobindDecorator.default)(_class = (_temp = _class2 = class Log {
  constructor(container = {}) {
    var _container$readline, _container$stdout, _container$stderr, _container$setInterva, _container$setInterva2, _container$spinnerDel;

    this.readline = (_container$readline = container.readline) !== null && _container$readline !== void 0 ? _container$readline : _readline.default;
    this.stdout = (_container$stdout = container.stdout) !== null && _container$stdout !== void 0 ? _container$stdout : process.stdout;
    this.stderr = (_container$stderr = container.stderr) !== null && _container$stderr !== void 0 ? _container$stderr : process.stderr;
    this.setInterval = (_container$setInterva = container.setInterval) !== null && _container$setInterva !== void 0 ? _container$setInterva : setInterval;
    this.clearInterval = (_container$setInterva2 = container.setInterval) !== null && _container$setInterva2 !== void 0 ? _container$setInterva2 : clearInterval;
    this.spinnerDelay = (_container$spinnerDel = container.spinnerDelay) !== null && _container$spinnerDel !== void 0 ? _container$spinnerDel : 250;
    this.spinnerHandle = null;
  }

  info(...args) {
    this.stopSpinner();
    this.stderr.write(args.join(" ") + _os.default.EOL);
  }

  warning(...args) {
    this.stopSpinner();
    this.stderr.write(_chalk.default.yellow("warning:", args.join(" ")) + _os.default.EOL);
  }

  error(...args) {
    this.stopSpinner();
    this.stderr.write(_chalk.default.red("error:", args.join(" ")) + _os.default.EOL);
  }

  startSpinner(line) {
    if (this.spinnerHandle !== null) {
      this.stopSpinner();
    }

    let index = 0;

    const spinnerTick = () => {
      this.readline.clearLine(this.stdout, 0);
      this.readline.cursorTo(this.stdout, 0);
      this.stdout.write(Log.spinnerChars[index] + " " + this.spinnerTitle);
      index = (index + 1) % Log.spinnerChars.length;
    };

    this.spinnerTitle = line;
    this.spinnerHandle = this.setInterval(spinnerTick, this.spinnerDelay);
    spinnerTick();
  }

  restartSpinner() {
    this.startSpinner(this.spinnerTitle);
  }

  stopSpinnerNoMessage() {
    if (this.spinnerHandle !== null) {
      this.clearInterval(this.spinnerHandle);
      this.spinnerHandle = null;
      this.readline.clearLine(this.stdout, 0);
      this.readline.cursorTo(this.stdout, 0);
      return true;
    } else {
      return false;
    }
  }

  stopSpinner() {
    if (this.stopSpinnerNoMessage()) {
      this.stdout.write(_chalk.default.green("✔︎ ") + this.spinnerTitle + _os.default.EOL);
    }
  }

}, _class2.spinnerChars = "⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆", _temp)) || _class;

exports.Log = Log;
//# sourceMappingURL=Log.js.map