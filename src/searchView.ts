import * as vscode from 'vscode';
import { SearchResultsProvider } from './searchResultsProvider';

export class PinnedFoldersSearchViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pinned-folders-search';

    private _view?: vscode.WebviewView;
    private _onSearch: (value: string) => void;

    constructor(onSearch: (value: string) => void) {
        // console.log("* PinnedFoldersSearchViewProvider constructed");
        this._onSearch = onSearch;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView
    ) {
        // console.log("* resolveWebviewView CALLED");

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.type === 'search') {
                this._onSearch(message.value);
            }

            if (message.type === "reset") {
                vscode.commands.executeCommand("setContext", "pinnedFolders:hasSearchResults", false);
                const searchResultsProvider = new SearchResultsProvider();
                searchResultsProvider.clear();
                return;
            }

        });
    }

    private getHtml() {
        return `
            <html>
            <body style="padding: 8px; font-family: sans-serif;">
                <input id="searchBox" type="text" placeholder="Search pinned folders..." style="width: 96%; padding: 6px 2%; font-size: 13px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; " />
                
                <button id="resetBtn" style="padding: 6px 10px; margin-top: 5px; font-size: 12px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; "> Reset </button>

                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('searchBox');
                    const resetBtn = document.getElementById('resetBtn');

                    // Restore previous value
                    const state = vscode.getState();
                    if (state?.search) {
                        input.value = state.search;
                    }

                    input.addEventListener('input', () => {
                        vscode.setState({ search: input.value }); // save state
                        vscode.postMessage({
                            type: 'search',
                            value: input.value
                        });
                    });

                    resetBtn.addEventListener('click', () => {
                        input.value = "";
                        vscode.setState({ search: "" }); // clear state
                        vscode.postMessage({ type: 'reset' });
                    });
                </script>

            </body>
            </html>
        `;
    }
}
