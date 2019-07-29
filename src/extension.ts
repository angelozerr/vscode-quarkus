'use strict';

import { window, commands, ExtensionContext, QuickPickItem } from 'vscode';
import { generateProject } from './generateProject/generationWizard';
import { add } from './addExtensions/addExtensions';
import { ConfigManager } from './definitions/configManager';
import * as requirements from './languageServer/requirements';
import { prepareExecutable } from './languageServer/javaServerStarter';
import { LanguageClientOptions, LanguageClient, ExecuteCommandParams } from 'vscode-languageclient';

let languageClient: LanguageClient;

export interface QuickPickItemWithValue extends QuickPickItem {
  value: string;
}

export function activate(context: ExtensionContext) {
  connectToLS().then(() => {
    languageClient.onRequest('quarkus/properties', (params: any) => commands.executeCommand('com.redhat.jdtls.quarkus.jdt.ls.quarkus.samplecommand', params));
  }).catch((error) => {
    window.showErrorMessage(error.message, error.label).then((selection) => {
      if (error.label && error.label === selection && error.openUrl) {
        commands.executeCommand('vscode.open', error.openUrl);
      }
    });
  });

  registerVSCodeCommands(context);
}

export function deactivate() { }

function registerVSCodeCommands(context: ExtensionContext) {
  const configManager = new ConfigManager();

  /**
   * Command for creating a Quarkus Maven project
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.createMavenProject', () => {
    generateProject(configManager);
  }));

  /**
   * Command for adding Quarkus extensions to current Quarkus Maven project
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.addExtension', () => {
    add(configManager);
  }));

  /**
   * Temporary command to invoke jdt.ls extension command manually
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.jdtls', () => {

    console.log('jdtls invoked via command palette');

    const quarkusJtdlsCommand = "com.redhat.jdtls.quarkus.jdt.ls.quarkus.samplecommand";
    const quarkusJtdlsParameter = "parameters here";

    commands.executeCommand("java.execute.workspaceCommand", quarkusJtdlsCommand, quarkusJtdlsParameter).then((res) => {
      console.log("Return value from jdtls");
      console.log(res);
    });
  }));

  /**
   * Command that would be invoked when metadata received from Quarkus jdt.ls extension 
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.notifyQuarkusLS', (metadata) => {
    console.log("Notify Quarkus Langauge Server here");

    const params: ExecuteCommandParams = {
      command: "sendMetadata",
      arguments: [metadata]
    };

    commands.executeCommand("QuarkusLS", 'workspace/executeCommand', params).then((res) => {
      console.log("Quarkus LS has responded back.");
      console.log(res);
    });
  }));
}

function connectToLS() {
  return requirements.resolveRequirements().then(requirements => {
    let clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', pattern: '**/application.properties' }
      ]
    };

    let serverOptions = prepareExecutable(requirements);
    languageClient = new LanguageClient('Quarkus', 'Quarkus Tools', serverOptions, clientOptions);
    languageClient.start();
    return languageClient.onReady();
  });
}