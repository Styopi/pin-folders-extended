import * as vscode from 'vscode';
import * as path from 'path';

export class PinnedDragAndDropController implements vscode.TreeDragAndDropController<any> {
    dropMimeTypes = ['application/vnd.code.tree.pinned-folders'];
    dragMimeTypes = ['application/vnd.code.tree.pinned-folders'];

    constructor(
        private readonly onMove: (source: vscode.Uri, target: vscode.Uri) => Promise<void>,
        private readonly onCopy: (source: vscode.Uri, target: vscode.Uri) => Promise<void>
    ) { }

    async handleDrag(
        sourceItems: any[],
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ) {
        const item = sourceItems[0];
        dataTransfer.set('application/vnd.code.tree.pinned-folders', new vscode.DataTransferItem(item.uri.toString()));
    }

    async handleDrop(
        target: any,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ) {
        const raw = dataTransfer.get('application/vnd.code.tree.pinned-folders');
        if (!raw) return;

        const sourceUri = vscode.Uri.parse(raw.value);
        const targetUri = target.uri;

        const finalTarget = vscode.Uri.joinPath(targetUri, path.basename(sourceUri.fsPath));

        await this.onMove(sourceUri, finalTarget);
    }
}
