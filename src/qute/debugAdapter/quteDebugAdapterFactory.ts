import * as vscode from 'vscode';

/**
 * Debug Adapter Factory for Qute.
 * 
 * This factory provides a TCP server descriptor to connect VS Code
 * to the Qute debug adapter.
 */
export class QuteDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(
        session: vscode.DebugSession
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        const port = session.configuration.port ?? 4711; // default port if not specified
        return new vscode.DebugAdapterServer(port, '127.0.0.1');
    }
}