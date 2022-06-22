import * as vscode from 'vscode';
import * as path from 'path';
import { RequirementsData } from '../languageServer/requirements';
import { DebugAdapterExecutableOptions, workspace } from 'vscode';
import * as glob from 'glob';

const DEBUG = startedInDebugMode();
const DEBUG_PORT = 1077;
const QUTE_DAP_NAME = 'com.redhat.qute.dap-uber.jar';
const QUTE_DAP_MAIN_CLASS = 'com.redhat.qute.dap.QuteDebugAdapterLauncher';

export class QuteDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

  constructor(private requirements: RequirementsData) {

  }

  createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    if (!executable) {
      const requirements = this.requirements;
      //const command = 'C:\Program Files\RedHat\java-11-openjdk-11.0.7.10-1.windows.redhat.x86_64/bin/java' ;
       // why it doesnt work with JRE from vscode-java (c:\Users\azerr\.vscode\extensions\redhat.java-1.7.0-win32-x64\jre\17.0.3-win32-x86_64\bin\java)
       // const command = path.resolve(requirements.tooling_jre + '/bin/java');
       // const command = path.resolve(requirements.java_home + '/bin/java');
       const command = 'java';
      const args = prepareParams();
      const options = {env: process.env} as DebugAdapterExecutableOptions;
      return new vscode.DebugAdapterExecutable(command, args, options);
    }
    return executable;
  }
}

function prepareParams(): string[] {
  const params: string[] = [];
  if (DEBUG) {
    if (process.env.SUSPEND_SERVER === 'true') {
      params.push(`-agentlib:jdwp=transport=dt_socket,server=y,address=${DEBUG_PORT}`);
    } else {
      params.push(`-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${DEBUG_PORT},quiet=y`);
    }
  }

  const vmargs = workspace.getConfiguration("quarkus.tools").get("server.vmargs", '');
  /*if (os.platform() === 'win32') {
    const watchParentProcess = '-DwatchParentProcess=';
    if (vmargs.indexOf(watchParentProcess) < 0) {
      params.push(watchParentProcess + 'false');
    }
  }*/
  parseVMargs(params, vmargs);
  const serverHome: string = path.resolve(__dirname, '../server');
  const quteServerFound: Array<string> = glob.sync(`**/${QUTE_DAP_NAME}`, { cwd: serverHome });
  if (quteServerFound.length) {
    const classPath = quteServerFound[0];
    params.push('-cp');
    params.push(`${serverHome}/` + classPath);
    params.push(QUTE_DAP_MAIN_CLASS);
  } else {
    throw new Error('Unable to find required DAP JARs');
  }
  return params;
}

function hasDebugFlag(args: string[]): boolean {
  if (args) {
    // See https://nodejs.org/en/docs/guides/debugging-getting-started/
    return args.some(arg => /^--inspect/.test(arg) || /^--debug/.test(arg));
  }
  return false;
}

function startedInDebugMode(): boolean {
  const args: string[] = process.execArgv;
  return hasDebugFlag(args);
}

// exported for tests
export function parseVMargs(params: string[], vmargsLine: string): void {
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
