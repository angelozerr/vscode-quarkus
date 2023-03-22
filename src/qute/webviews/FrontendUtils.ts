/*
 * This file is released under the MIT license.
 * Copyright (c) 2017, 2023, Mike Lischke
 *
 * See LICENSE file for more info.
 */

import * as fs from "fs-extra";
import * as crypto from "crypto";
import * as path from "path";

import { ExtensionContext, Uri, window, Webview, commands, ProviderResult, TextDocument } from "vscode";

export class FrontendUtils {

  /**
   * Returns the absolute path to a file located in our out folder.
   *
   * @param file The base file name.
   * @param context The context of this extension to get its path regardless where it is installed.
   * @param webview When given format the path for use in this webview.
   *
   * @returns The computed path.
   */
  public static getOutPath(file: string, context: ExtensionContext, webview?: Webview): string {
    if (webview) {
      const uri = Uri.file(context.asAbsolutePath(path.join("dist", file)));
      return webview.asWebviewUri(uri).toString();
    }
    return context.asAbsolutePath(path.join("dist", file));
  }

  /**
 * Returns the absolute path to a file located in the node_modules folder.
 *
 * @param webview The webview for which to create the path.
 * @param file The base file name.
 * @param context The context of this extension to get its path regardless where it is installed.
 *
 * @returns The computed path.
 */
  public static getNodeModulesPath(webview: Webview, file: string, context: ExtensionContext): string {
    const path = Uri.joinPath(context.extensionUri, "node_modules", file);
    return webview.asWebviewUri(path).toString();
  }

  /**
     * Returns the absolute path to a file located in our misc folder.
     *
     * @param file The base file name.
     * @param context The context of this extension to get its path regardless where it is installed.
     * @param webview When given format the path for use in this webview.
     *
     * @returns The computed path.
     */
  public static getAssetsPath(file: string, context: ExtensionContext, webview?: Webview): string {
    if (webview) {
      const uri = Uri.file(context.asAbsolutePath(path.join("assets", file)));
      return webview.asWebviewUri(uri).toString();
    }
    return context.asAbsolutePath(path.join("assets", file));
  }

  /**
       * Asks the user for a file to store the given data in. Checks if the file already exists and ask for permission to
       * overwrite it, if so. Also copies a number extra files to the target folder.
       *
       * @param fileName A default file name the user can change, if wanted.
       * @param filters The file type filter as used in showSaveDialog.
       * @param data The data to write.
       * @param extraFiles Files to copy to the target folder (e.g. css).
       */
  public static exportDataWithConfirmation(fileName: string, filters: { [name: string]: string[]; }, data: string,
    extraFiles: string[]): void {
    void window.showSaveDialog({
      defaultUri: Uri.file(fileName),
      filters,
    }).then((uri: Uri | undefined) => {
      if (uri) {
        const value = uri.fsPath;
        fs.writeFile(value, data, (error) => {
          if (error) {
            void window.showErrorMessage("Could not write to file: " + value + ": " + error.message);
          } else {
            this.copyFilesIfNewer(extraFiles, path.dirname(value));
            void window.showInformationMessage("Diagram successfully written to file '" + value + "'.");
          }
        });
      }
    });
  }

  /**
     * Copies all given files to the specified target folder if they don't already exist there
     * or are older than the source files.
     *
     * @param files A list of paths for files to be copied.
     * @param targetPath The target path of the copy operation.
     */
  public static copyFilesIfNewer(files: string[], targetPath: string): void {
    try {
      fs.ensureDirSync(targetPath);
    } catch (error) {
      void window.showErrorMessage(`Could not create target folder '${targetPath}'. ${String(error)}`);
    }

    for (const file of files) {
      try {
        let canCopy = true;
        const targetFile = path.join(targetPath, path.basename(file));
        if (fs.existsSync(targetFile)) {
          const sourceStat = fs.statSync(file);
          const targetStat = fs.statSync(targetFile);
          canCopy = targetStat.mtime < sourceStat.mtime;
        }

        if (canCopy) {
          void fs.copy(file, targetFile, { overwrite: true });
        }
      } catch (error) {
        void window.showErrorMessage(`Could not copy file '${file}'. ${String(error)}`);
      }
    }
  }
}
