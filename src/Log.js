import readline from "readline"
import chalk from "chalk"
import autobind from "autobind-decorator"
import os from "os"

@autobind
export class Log {
  static spinnerChars = "⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆"

  constructor(container = {}) {
    this.readline = container.readline ?? readline
    this.stdout = container.stdout ?? process.stdout
    this.stderr = container.stderr ?? process.stderr
    this.setInterval = container.setInterval ?? setInterval
    this.clearInterval = container.setInterval ?? clearInterval
    this.spinnerDelay = container.spinnerDelay ?? 250
    this.spinnerHandle = null
  }

  info(...args) {
    this.stopSpinner()
    this.stderr.write(args.join(" ") + os.EOL)
  }

  warning(...args) {
    this.stopSpinner()
    this.stderr.write(chalk.yellow("warning:", args.join(" ")) + os.EOL)
  }

  error(...args) {
    this.stopSpinner()
    this.stderr.write(chalk.red("error:", args.join(" ")) + os.EOL)
  }

  startSpinner(line) {
    if (this.spinnerHandle !== null) {
      this.stopSpinner()
    }

    let index = 0

    const spinnerTick = () => {
      this.readline.clearLine(this.stdout, 0)
      this.readline.cursorTo(this.stdout, 0)
      this.stdout.write(Log.spinnerChars[index] + " " + this.spinnerTitle)

      index = (index + 1) % Log.spinnerChars.length
    }

    this.spinnerTitle = line
    this.spinnerHandle = this.setInterval(spinnerTick, this.spinnerDelay)

    spinnerTick()
  }

  restartSpinner() {
    this.startSpinner(this.spinnerTitle)
  }

  stopSpinnerNoMessage() {
    if (this.spinnerHandle !== null) {
      this.clearInterval(this.spinnerHandle)
      this.spinnerHandle = null
      this.readline.clearLine(this.stdout, 0)
      this.readline.cursorTo(this.stdout, 0)
      return true
    } else {
      return false
    }
  }

  stopSpinner() {
    if (this.stopSpinnerNoMessage()) {
      this.stdout.write(chalk.green("✔︎ ") + this.spinnerTitle + os.EOL)
    }
  }
}
