import { workspace } from 'vscode';
import { Executable, ExecutableOptions } from 'vscode-languageclient';
import { RequirementsData } from './requirements';
import * as os from 'os';
import * as path from 'path';
const glob = require('glob');

const DEBUG = startedInDebugMode();
const DEBUG_PORT = 1064;
const SERVER_NAME = 'com.redhat.microprofile.ls-uber.jar';
const QUTE_DEBUG_PORT = 1065;
const QUTE_SERVER_NAME = 'com.redhat.qute.ls-uber.jar';

export function prepareMicroProfileExecutable(requirements: RequirementsData): Executable {
  return prepareExecutable(requirements, SERVER_NAME, DEBUG_PORT);
}

export function prepareQuteExecutable(requirements: RequirementsData): Executable {
  return prepareExecutable(requirements, QUTE_SERVER_NAME, QUTE_DEBUG_PORT);
}

function prepareExecutable(requirements: RequirementsData, serverName: string, debugPort: number): Executable {
  const executable: Executable = Object.create(null);
  const options: ExecutableOptions = Object.create(null);
  options.env = process.env;
  options.stdio = 'pipe';
  executable.options = options;
  executable.command = path.resolve(requirements.java_home + '/bin/java');
  executable.args = prepareParams(serverName, debugPort);
  return executable;
}

function prepareParams(serverName: string, debugPort: number): string[] {
  const params: string[] = [];
  if (DEBUG) {
    params.push(`-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${debugPort},quiet=y`);
    // suspend=y is the default. Use this form if you need to debug the server startup code:
    // params.push(`-agentlib:jdwp=transport=dt_socket,server=y,address=${DEBUG_PORT}`);
  }

  const vmargs = workspace.getConfiguration("xml").get("server.vmargs", '');
  if (os.platform() === 'win32') {
    const watchParentProcess = '-DwatchParentProcess=';
    if (vmargs.indexOf(watchParentProcess) < 0) {
      params.push(watchParentProcess + 'false');
    }
  }
  parseVMargs(params, vmargs);
  const serverHome: string = path.resolve(__dirname, '../server');
  const launchersFound: Array<string> = glob.sync(`**/${serverName}`, { cwd: serverHome });
  if (launchersFound.length) {
    params.push('-jar'); params.push(path.resolve(serverHome, launchersFound[0]));
  }
  return params;
}

function startedInDebugMode(): boolean {
  const args = (process as any).execArgv;
  if (args) {
    return args.some((arg: any) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect-brk=?/.test(arg));
  }
  return false;
}

// exported for tests
export function parseVMargs(params: any[], vmargsLine: string) {
  if (!vmargsLine) {
    return;
  }
  const vmargs = vmargsLine.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (vmargs === null) {
    return;
  }
  vmargs.forEach(arg => {
    // remove all standalone double quotes
    arg = arg.replace(/(\\)?"/g, ($0, $1) => { return ($1 ? $0 : ''); });
    // unescape all escaped double quotes
    arg = arg.replace(/(\\)"/g, '"');
    if (params.indexOf(arg) < 0) {
      params.push(arg);
    }
  });
}
