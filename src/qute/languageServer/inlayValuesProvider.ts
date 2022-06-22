import { CancellationToken, EventEmitter, InlayHintKind, InlineValue, InlineValueContext, InlineValuesProvider, InlineValueText, ProviderResult, Range, TextDocument } from "vscode";
import * as ls from 'vscode-languageserver-protocol';
import { LanguageClient, RequestType } from "vscode-languageclient/node";

export class QuteInlineValuesProvider implements InlineValuesProvider {

  private onDidChange = new EventEmitter<void>();

  public onDidChangeInlineValues = this.onDidChange.event;

  constructor(private client: LanguageClient) {
    this.client.onRequest(InlineValueRefreshRequest.type, async () => {
      this.onDidChange.fire();
    });
  }

  async provideInlineValues(document: TextDocument, viewPort: Range, context: InlineValueContext, token: CancellationToken): Promise<InlineValue[]> {
    const lsContext: LSInlineValueContext = {
      frameId: context.frameId,
      stoppedLocation: this.client.code2ProtocolConverter.asRange(context.stoppedLocation)
    };
    const requestParams: InlineValueParams = {
      textDocument: this.client.code2ProtocolConverter.asTextDocumentIdentifier(document),
      range: this.client.code2ProtocolConverter.asRange(viewPort),
      context: lsContext
    };
    try {
      const values = await this.client.sendRequest(InlineValueRequest.type, requestParams, token);
      if (token.isCancellationRequested) {
        return [];
      }
      return asInlineValues(values, this.client);
    } catch (error) {
      return this.client.handleFailedRequest(InlineValueRequest.type, token, error);
    }
  }
}

/**
 * A parameter literal used in inline value requests.
 *
 * @since 3.17.0
 */
export type InlineValueParams = /*extends WorkDoneProgressParams */ {
  /**
   * The text document.
   */
  textDocument: ls.TextDocumentIdentifier;

  /**
   * The document range for which inline values should be computed.
   */
  range: ls.Range;

  /**
   * Additional information about the context in which inline values were
   * requested.
   */
  context: LSInlineValueContext;
};

/**
 * @since 3.17.0
 */
export type LSInlineValueContext = {
  /**
   * The stack frame (as a DAP Id) where the execution has stopped.
   */
  frameId: number;

  /**
   * The document range where execution has stopped.
   * Typically the end position of the range denotes the line where the
   * inline values are shown.
   */
  stoppedLocation: ls.Range;
};

/**
 * Inline value information can be provided by different means:
 * - directly as a text value (class InlineValueText).
 * - as a name to use for a variable lookup (class InlineValueVariableLookup)
 * - as an evaluatable expression (class InlineValueEvaluatableExpression)
 * The InlineValue types combines all inline value types into one type.
 *
 * @since 3.17.0
 */
export type LSInlayValue = LSInlineValueText /*| LSInlineValueVariableLookup
  | LSInlineValueEvaluatableExpression*/;

  /**
 * Provide inline value as text.
 *
 * @since 3.17.0
 */
export type LSInlineValueText = {
	/**
	 * The document range for which the inline value applies.
	 */
	range: ls.Range;

	/**
	 * The text of the inline value.
	 */
	text: string;
};

namespace InlineValueRequest {
  export const type: RequestType<InlineValueParams, LSInlayValue[], any> = new RequestType('textDocument/inlineValue');
}

/**
 * @since 3.17.0 - proposed state
 */
namespace InlineValueRefreshRequest {
  export const type: RequestType<void, void, void> = new RequestType('workspace/inlineValue/refresh');
}

async function asInlineValues(values: LSInlayValue[] | undefined | null, client: LanguageClient): Promise<InlineValue[] | undefined> {
  if (!Array.isArray(values)) {
    return undefined;
  }
  return values.map(lsValue => asInlineValue(lsValue, client));
}

function asInlineValue(value: LSInlayValue, client: LanguageClient): InlineValue {
  const label = value.text;
  const result = new InlineValueText(client.protocol2CodeConverter.asRange(value.range), label);
  return result;
}
