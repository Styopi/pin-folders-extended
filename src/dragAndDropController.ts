import * as vscode from 'vscode';
import * as path from 'path';
import { PinTreeItem } from './pinFolders';
import { PinFoldersTreeDataProvider } from './pinFolders';

export class PinnedDragAndDropController implements vscode.TreeDragAndDropController<PinTreeItem> {

    dropMimeTypes = ['application/vnd.code.tree.pinned-folders'];
    dragMimeTypes = ['application/vnd.code.tree.pinned-folders'];

    constructor(
        private readonly onMove: (source: vscode.Uri, target: vscode.Uri) => Promise<void>,
        private readonly onCopy: (source: vscode.Uri, target: vscode.Uri) => Promise<void>,
        private readonly provider: PinFoldersTreeDataProvider
    ) { }

    async handleDrag(
        sourceItems: readonly PinTreeItem[],
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ) {
        const item = sourceItems[0];

        console.log('*** handleDrag', item.contextValue);

        // --- PINNED FOLDER → REORDER ---
        if (item.contextValue === 'pinnedFolder') {
            dataTransfer.set(
                'application/vnd.code.tree.pinned-folders',
                new vscode.DataTransferItem(sourceItems)
            );
            return;
        }

        // --- FILE / SUBFOLDER → MOVE ---
        dataTransfer.set(
            'application/vnd.code.tree.pinned-folders',
            new vscode.DataTransferItem(item.uri.toString())
        );
    }

    async handleDrop(
        target: PinTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ) {
        if (!target) return;

        const raw = await dataTransfer.get('application/vnd.code.tree.pinned-folders');
        if (!raw) return;

        const value = raw.value;

        // --- CASE 1: REORDER PINNED FOLDERS ---
        if (Array.isArray(value)) {
            const sources = value as PinTreeItem[];

            if (target.contextValue === 'pinnedFolder' && sources[0].contextValue === 'pinnedFolder') {
                console.log('*** reorder pinned folders');
                this.provider.reorderPinnedFolders(sources[0], target);
                return;
            }
        }

        // --- CASE 2: MOVE FILE / SUBFOLDER ---
        if (typeof value === 'string') {
            console.log('*** move file/subfolder');

            const sourceUri = vscode.Uri.parse(value);

            let dropTarget = target.uri;

            // ak dropuješ na súbor → presúvame do jeho rodiča
            if (target.contextValue === 'file') {
                dropTarget = vscode.Uri.joinPath(target.uri, '..');
            }

            // pinnedFolder aj subFolder berieme ako priečinok → dropTarget = target.uri
            const finalTarget = vscode.Uri.joinPath(dropTarget, path.basename(sourceUri.fsPath));

            await this.onMove(sourceUri, finalTarget);
        }
    }
}
