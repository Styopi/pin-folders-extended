import * as vscode from 'vscode';

export class SearchResultItem extends vscode.TreeItem {
    public children: SearchResultItem[] = [];
    public parent?: SearchResultItem;

    constructor(
        public readonly label: string,
        public readonly uri: vscode.Uri,
        public readonly isDirectory: boolean,
        parent?: SearchResultItem,
        collapsible: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
    ) {
        super(label, collapsible);

        // console.log('**collapsible', collapsible);

        this.tooltip = uri.fsPath;
        this.resourceUri = uri;
        this.collapsibleState = collapsible;

        if (isDirectory && !parent) {
            this.iconPath = new vscode.ThemeIcon(
                'bookmark',
                new vscode.ThemeColor('terminal.ansiBrightRed'),
            );
        }

        if (!isDirectory) {
            this.command = {
                command: "vscode.open",
                title: "Open File",
                arguments: [uri]
            };
        }
    }
}
