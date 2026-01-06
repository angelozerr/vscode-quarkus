import * as vscode from 'vscode';

/**
 * Entry point for server -> client DAP requests.
 * Handles custom requests sent from the debug adapter.
 */
export async function handleServerRequest(
    session: vscode.DebugSession,
    message: any
) {
    switch (message.command) {
        case 'qute/resolveJavaSource':
            await handleResolveJavaSource(session, message);
            break;
        default:
            // Ignore unknown server requests
            break;
    }
}

/* ============================================================
 * Handle qute/resolveJavaSource
 * ============================================================ */

async function handleResolveJavaSource(
    session: vscode.DebugSession,
    request: any
) {
    try {
        const result = await resolveJavaSource(request.arguments);
        sendResponse(session, request, true, result);
    } catch (e: any) {
        sendResponse(session, request, false, undefined, String(e));
    }
}

/* ============================================================
 * Minimal implementation of Java source resolution
 * ============================================================ */

async function resolveJavaSource(args: {
    javaElementUri: string;
    typeName: string;
    method?: string;
    annotation: string;
}) {
    // Extract simple class name from fully qualified type name
    const simpleName = args.typeName.split('.').pop()!;
    
    // Find matching Java file in workspace
    const files = await vscode.workspace.findFiles(`**/${simpleName}.java`);

    if (!files.length) {
        throw new Error(`Java source not found for ${args.typeName}`);
    }

    // Return minimal response matching JavaSourceLocationResponse
    return {
        javaFileUri: files[0].toString(),
        startLine: 1 // 1-based line index
    };
}

/* ============================================================
 * DAP response injection
 * ============================================================ */

function sendResponse(
    session: vscode.DebugSession,
    request: any,
    success: boolean,
    body?: any,
    errorMessage?: string
) {
    const response = {
        type: 'response',
        request_seq: request.seq,
        command: request.command,
        success,
        ...(success
            ? { body }
            : { message: errorMessage ?? 'Unknown error' })
    };

    // Inject response directly into the DAP message stream
    session.customRequest('__sendToDebugAdapter', response);
}
