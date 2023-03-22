import { window, workspace, TextEditor, ExtensionContext, Uri, WebviewPanel, Webview, ViewColumn } from "vscode";
import * as path from "path";
import { WebviewProvider } from "./WebviewProvider";
import { FrontendUtils } from "./FrontendUtils";
import { IQuteGraphData, IQuteGraphLayoutNode, IQuteGraphRendererData, IQuteStatePosition, NodeType } from "../../../scripts/types";

export interface IWebviewShowOptions {
  [key: string]: boolean | number | string;

  title: string;
}

export interface IWebviewMessage {
  [key: string]: unknown;
}

export class QuteProjectDiagramProvider extends WebviewProvider {

  protected updateContent(uri: Uri): boolean {
    const graphData = this.prepareRenderData(uri);

    this.sendMessage(uri, {
      command: "updateQutereeData",
      graphData,
    });

    return true;
  }

  generateContent(webview: Webview, uri: Uri, options: IWebviewShowOptions): string {
    const graphData = this.prepareRenderData(uri);

    const rendererScriptPath = FrontendUtils.getOutPath("webview-scripts.js", this.context,
      webview);
    const exportScriptPath = FrontendUtils.getOutPath("webview-scripts.js", this.context,
      webview);
    const graphLibPath = FrontendUtils.getNodeModulesPath(webview, "d3/dist/d3.js", this.context);

    const nonce = this.generateNonce();
    const name = graphData.ruleName ?? "";

    return `<!DOCTYPE html>
            <html style="width: 100%, height: 100%">
                <head>
                    <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
                    ${this.generateContentSecurityPolicy(webview, nonce)}
                    ${this.getStyles(webview)}
                    <base target="_blank">
                    <script nonce="${nonce}" src="${graphLibPath}"></script>
                    <script nonce="${nonce}">
                        let graphRenderer;
                        let graphExport;
                    </script>
                </head>
                <body>
                    <div class="header">
                        <span class="atn-graph-color">
                            <span class="graph-initial">Ⓡ</span>ule&nbsp;&nbsp;</span>
                            ${name}
                            <span class="rule-index">(rule index: ${this.currentRuleIndex ?? "?"})</span>
                        <span class="action-box">
                            Reset display <a onClick="graphRenderer.resetTransformation();">
                            <span class="atn-graph-color" style="font-size: 120%; font-weight: 800; cursor: pointer;
                                vertical-align: middle;">↺</span></a>&nbsp;
                            Save to file<a onClick="graphExport.exportToSVG('atn', '${name}');">
                                <span class="atn-graph-save-image" />
                            </a>
                        </span>
                    </div>
                    <svg>
                        <defs>
                            <filter id="white-glow" x="-150%" y="-150%" width="300%" height="300%">
                                <feFlood result="flood" flood-color="#ffffff" flood-opacity="0.15" />
                                <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in" />
                                <feMorphology in="mask" result="dilated" operator="dilate" radius="5" />
                                <feGaussianBlur in="dilated" result="blurred" stdDeviation="5" />
                                <feMerge>
                                    <feMergeNode in="blurred" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="black-glow" x="-1000%" y="-1000%" width="2000%" height="2000%">
                                <feFlood result="flood" flood-color="#000000" flood-opacity="0.15" />
                                <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in" />
                                <feMorphology in="mask" result="dilated" operator="dilate" radius="4" />
                                <feGaussianBlur in="dilated" result="blurred" stdDeviation="5" />
                                <feMerge>
                                    <feMergeNode in="blurred" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <marker id="transitionEndCircle" viewBox="0 -5 10 10" refX="31" refY="0" markerWidth="7"
                                markerHeight="7" orient="auto" class="marker">
                                <path d="M0,-4L10,0L0,4" />
                            </marker>
                            <marker id="transitionEndRect" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="7"
                                markerHeight="7" orient="auto" class="marker">
                                <path d="M0,-4L10,0L0,4" />
                            </marker>
                        </defs>
                    </svg>
                    <script nonce="${nonce}" type="module">
                        import { QuteProjectGraphRenderer } from "${rendererScriptPath}";
                        import { GraphExport, vscode } from "${exportScriptPath}";
                        graphExport = new GraphExport();
                        graphRenderer = new QuteProjectGraphRenderer(vscode);
                        graphRenderer.render(${JSON.stringify(graphData)});
                    </script>
                </body>
            </html>
        `;
  }

  private prepareRenderData(uri: Uri): IQuteGraphRendererData {
    const ruleName = this.currentRule ? this.currentRule.replace(/\$/g, "$$") : undefined;

    const configuration = workspace.getConfiguration("antlr4.atn");
    const maxLabelCount = configuration.get<number>("maxLabelCount", 3);

    const hash = 0; // FrontendUtils.hashForPath(uri.fsPath);
    const fileTransformations = null; //QuteProjectDiagramProvider.cachedATNTransformations[hash] ?? {};

    let initialScale = 0.5;
    let initialTranslation = {};

    const setPosition = (node: IQuteGraphLayoutNode, position?: IQuteStatePosition): void => {
      // If no transformation data is available, give the start and end nodes a fixed vertical
      // position and a horizontal initial position (which is not the same as a fixed position)
      // to get the graph rendered near the svg center.
      // The same positions are used when the user resets the transformation.
      //const fx = position?.fx;
      //const fy = position?.fy;
      switch (node.type) {
        /*    case ATNStateType.RULE_START: {
                node.fy = fy ?? 0;
                if (fx !== undefined) {
                    node.fx = fx;
                } else {
                    node.x = -1000;
                }
                break;
            }

            case ATNStateType.RULE_STOP: {
                node.fy = fy ?? 0;
                if (fx !== undefined) {
                    node.fx = fx;
                } else {
                    node.x = 1000;
                }
                break;
            }
*/
        default: {
          //node.fx = position?.fx;
          //node.fy = position?.fy;

          break;
        }

      }

    };

    let graphData: IQuteGraphData | undefined;

    try {
      graphData = {
        nodes: [{ name: 'main?', id:'1', type: NodeType.Template},
                { name: 'todo',id:2, type: NodeType.Template },
                { name: '@MyClass',id:2, type: NodeType.JavaMethod }],
      } as IQuteGraphData;

      if (graphData) {
        const ruleTransformation = fileTransformations[ruleName];
        if (ruleTransformation) {
          initialScale = ruleTransformation.scale;

          initialTranslation = ruleTransformation.translation;

          for (const node of graphData.nodes as IQuteGraphLayoutNode[]) {
            setPosition(node, ruleTransformation.statePositions[node.id]);
          }
        } else {
          for (const node of graphData.nodes as IQuteGraphLayoutNode[]) {
            setPosition(node);
          }
        }
      }
    } catch (e) {
      // Ignore errors.
    }

    const result = {
      uri,
      ruleName,
      maxLabelCount,
      graphData,
      initialScale,
      initialTranslation,
    };

    return result;
  }

}
