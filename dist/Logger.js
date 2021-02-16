"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const os_1 = __importDefault(require("os"));
class ConsoleLogger {
    constructor(container = {}) {
        var _a, _b, _c, _d, _e, _f;
        this.readline = (_a = container.readline) !== null && _a !== void 0 ? _a : readline_1.default;
        this.stdout = (_b = container.stdout) !== null && _b !== void 0 ? _b : process.stdout;
        this.stderr = (_c = container.stderr) !== null && _c !== void 0 ? _c : process.stderr;
        this.setInterval = (_d = container.setInterval) !== null && _d !== void 0 ? _d : setInterval;
        this.clearInterval = (_e = container.setInterval) !== null && _e !== void 0 ? _e : clearInterval;
        this.spinnerDelay = (_f = container.spinnerDelay) !== null && _f !== void 0 ? _f : 250;
        this.spinnerHandle = null;
    }
    info(...args) {
        this.stopSpinner();
        this.stderr.write(args.join(" ") + os_1.default.EOL);
    }
    warning(...args) {
        this.stopSpinner();
        this.stderr.write(chalk_1.default.yellow("warning:", args.join(" ")) + os_1.default.EOL);
    }
    error(...args) {
        this.stopSpinner();
        this.stderr.write(chalk_1.default.red("error:", args.join(" ")) + os_1.default.EOL);
    }
    startSpinner(line) {
        if (this.spinnerHandle !== null) {
            this.stopSpinner();
        }
        let index = 0;
        const spinnerTick = () => {
            this.readline.clearLine(this.stdout, 0);
            this.readline.cursorTo(this.stdout, 0);
            this.stdout.write(ConsoleLogger.spinnerChars[index] + " " + this.spinnerTitle);
            index = (index + 1) % ConsoleLogger.spinnerChars.length;
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
        }
        else {
            return false;
        }
    }
    stopSpinner() {
        if (this.stopSpinnerNoMessage()) {
            this.stdout.write(chalk_1.default.green("✔︎ ") + this.spinnerTitle + os_1.default.EOL);
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
ConsoleLogger.spinnerChars = "⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆";
//# sourceMappingURL=Logger.js.map