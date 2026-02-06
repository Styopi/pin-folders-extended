import * as vscode from 'vscode';
import { SearchResultItem } from './searchResultItem';

export class SearchResultsProvider implements vscode.TreeDataProvider<SearchResultItem> {
    private results: SearchResultItem[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    setResults(items: SearchResultItem[]) {
        this.results = items;
        this._onDidChangeTreeData.fire();
    }

    clear() {
        this.results = [];
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(item: SearchResultItem): vscode.TreeItem {
        return item;
    }

    async getChildren(element?: SearchResultItem): Promise<SearchResultItem[]> {
        if (!element) {
            return this.results;
        }
        
        return element.children;
    }
}
