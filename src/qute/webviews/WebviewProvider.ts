import { window, workspace, TextEditor, ExtensionContext, Uri, WebviewPanel, Webview, ViewColumn } from "vscode";
import * as path from "path";
import { FrontendUtils } from "./FrontendUtils";
import { basename, join } from "path";

export interface IWebviewShowOptions {
  [key: string]: boolean | number | string;

  title: string;
}

export interface IWebviewMessage {
  [key: string]: unknown;
}

export class WebviewProvider {
  protected currentRule: string | undefined;
  protected currentRuleIndex: number | undefined;

  // Keep track of all created panels, to avoid duplicates.
  private webViewMap = new Map<string, [WebviewPanel, IWebviewShowOptions]>();

  public constructor(protected context: ExtensionContext) { }

  public showWebview(uri: Uri, options: IWebviewShowOptions): void {
    const uriString = ''; //uri.toString();
    if (this.webViewMap.has(uriString)) {
      const [existingPanel] = this.webViewMap.get(uriString)!;
      existingPanel.title = options.title;
      if (!this.updateContent(uri)) {
        existingPanel.webview.html = 'YES'; this.generateContent(existingPanel.webview, uri, options);
      }

      return;
    }

    const panel = window.createWebviewPanel("qute-vscode-webview", options.title, ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    this.webViewMap.set(uriString, [panel, options]);

    panel.onDidDispose(() => {
      this.webViewMap.delete(uriString);
    });

    panel.webview.html = this.generateContent(panel.webview, uri, options);

    panel.webview.onDidReceiveMessage((message: IWebviewMessage) => {
      if (this.handleMessage(message)) {
        return;
      }

      switch (message.command) {

        case "saveHTML": {
          if (typeof message.type === "string" && typeof message.name === "string") {
            const css: string[] = [];
            css.push(FrontendUtils.getAssetsPath("light.css", this.context));
            css.push(FrontendUtils.getAssetsPath("dark.css", this.context));
            /*const customStyles = workspace.getConfiguration("antlr4").customCSS as string | string[];
            if (customStyles && Array.isArray(customStyles)) {
              for (const style of customStyles) {
                css.push(style);
              }
            }*/

            try {
              const section = "antlr4." + message.type;
              const saveDir = workspace.getConfiguration(section).saveDir as string ?? "";
              const target = join(saveDir, message.name + "." + message.type);
              FrontendUtils.exportDataWithConfirmation(target,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                { HTML: ["html"] }, message.html as string, css);
            } catch (error) {
              void window.showErrorMessage("Couldn't write HTML file: " + String(error));
            }
          }

          break;
        }

      }

    });

  }
  protected updateContent(uri: Uri): boolean {
    return false;
  }

  generateContent(webview: Webview, uri: Uri, options: IWebviewShowOptions): string {
    return ''
  }

  protected sendMessage(uri: Uri, args: IWebviewMessage): boolean {
    if (this.webViewMap.has(uri.toString())) {
      const [panel] = this.webViewMap.get(uri.toString())!;
      void panel.webview.postMessage(args);

      return true;
    }

    return false;
  }

  // Can be overridden by descendants to handle specific messages.
  // Must return true when default handling shouldn't take place.
  protected handleMessage(_message: IWebviewMessage): boolean {
    return false;
  }


  /**
   * Constructs the required CSP entry for webviews, which allows them to load local files.
   *
   * @param webview The view for which to return the CSP tag.
   * @param nonce A nonce for scripts.
   *
   * @returns The CSP string.
   */
  protected generateContentSecurityPolicy(webview: Webview, nonce: string): string {
    return `<meta http-equiv="Content-Security-Policy" content="default-src 'none';
      script-src 'nonce-${nonce}';
      script-src-attr 'unsafe-inline';
      style-src ${webview.cspSource} 'self' 'unsafe-inline';
      img-src ${webview.cspSource} 'self' "/>
  `;
  }

  protected getStyles(webView: Webview): string {
    const baseStyles = [
      FrontendUtils.getAssetsPath("qute/light.css", this.context, webView),
      FrontendUtils.getAssetsPath("qute/dark.css", this.context, webView),
    ];

    const defaults = baseStyles.map((link) => {
      return `<link rel="stylesheet" type="text/css" href="${link}">`;
    }).join("\n");

    return defaults;
  }

  protected getScripts(nonce: string, scripts: string[]): string {
    return scripts.map((source) => {
      return `<script type="text/javascript" src="${source}" nonce="${nonce}"></script>`;
    }).join("\n");
  }

  protected generateNonce(): string {
    return `${new Date().getTime()}${new Date().getMilliseconds()}`;
  }

}
