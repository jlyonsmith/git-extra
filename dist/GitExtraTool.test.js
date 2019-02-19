"use strict";

var _BitbucketTool = require("./BitbucketTool");

var _tmp = _interopRequireDefault(require("tmp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const toolName = "bucket";
let tmpDirObj = null;
beforeAll(() => {
  tmpDirObj = _tmp.default.dirSync();
});
afterAll(() => {
  if (tmpDirObj) {
    tmpDirObj.removeCallback();
  }
});

function getMockLog() {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn()
  };
}

function getOutput(fn) {
  const calls = fn.mock.calls;

  if (calls.length > 0 && calls[0].length > 0) {
    return calls[0][0];
  } else {
    return "";
  }
}

test("--help", done => {
  const mockLog = getMockLog();
  const tool = new _BitbucketTool.BitbucketTool(toolName, mockLog);
  return tool.run(["--help"]).then(exitCode => {
    expect(exitCode).toBe(0);
    expect(getOutput(mockLog.info)).toEqual(expect.stringContaining("--help"));
    done();
  });
});
test("--version", done => {
  const mockLog = getMockLog();
  const tool = new _BitbucketTool.BitbucketTool(toolName, mockLog);
  return tool.run(["--version"]).then(exitCode => {
    expect(exitCode).toBe(0);
    expect(getOutput(mockLog.info)).toEqual(expect.stringMatching(/^v/));
    done();
  });
});
//# sourceMappingURL=GitExtraTool.test.js.map