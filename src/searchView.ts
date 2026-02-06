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

        setTimeout(() => {
            webviewView.webview.postMessage({ type: "resetState" });
        }, 50);

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
            <head>
                <link rel="stylesheet" href="https://microsoft.github.io/vscode-codicons/dist/codicon.css">
            </head>
            <body style="padding: 8px; font-family: sans-serif;">
                <style>
                    #searchPanel {
                        display: flex;
                        gap: 6px;
                        align-items: center;
                        padding-bottom: 5px;
                    }

                    #searchBox {
                        flex: 1; 
                        flex-shrink: 1;
                        min-width: 0;
                        padding: 6px; 
                        font-size: 13px; 
                        background: var(--vscode-input-background); 
                        color: var(--vscode-input-foreground); 
                        border: 1px solid var(--vscode-input-border); 
                        border-radius: 3px; 
                    }

                    #resetBtn {
                        padding: 6px 10px; 
                        font-size: 12px;
                        cursor: pointer;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 3px;
                        flex-shrink: 0;
                        height: 100%;
                    }

                    #historyLabel {
                        padding: 0px;
                        margin: 5px 0px;
                        font-size: 12px;
                        color: var(--vscode-input-border);
                    }

                    #history {
                        margin-top: 5px;
                        font-size: 12px;
                    }

                    .history-item {
                        font-size: 13px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 3px 0px;
                        margin: 0px;
                        border-radius: 2px;
                        cursor: pointer;
                        opacity: 0.8;
                    }

                    .history-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }

                    .history-item .history-icon {
                        font-size: 13px;
                        opacity: 0;
                        transition:
                        opacity 0.15s;
                        margin-left: 10px;
                    }
                    
                    .history-item:hover .history-icon{
                        opacity: 1;
                    }
                </style>

                <div id="searchPanel">
                    <input id="searchBox" type="text" placeholder="Search..."/>
                    <button id="resetBtn"> Reset </button>
                </div>
                    
                <p id="historyLabel">Search history:</p>
                <div id="history"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('searchBox');
                    const resetBtn = document.getElementById('resetBtn');
                    const historyDiv = document.getElementById('history');
                    let historyLength = 10;
                    let historyTimer = null;
                    let historyTimerTimeout = 1500;

                    // Load state
                    const state = vscode.getState() || { search: "", history: [] };

                    // Restore input
                    input.value = state.search || "";

                    // Render history
                    function renderHistory() {
                        historyDiv.innerHTML = "";

                        if (!state.history || state.history.length === 0) {
                            return;
                        }

                        state.history.slice().reverse().forEach(item => {
                            const row = document.createElement('div');
                            row.className = "history-item";
                            
                            const text = document.createElement('span');
                            text.className = "history-text";
                            text.textContent = item;
                            
                            const icon = document.createElement('span');
                            icon.className = "history-icon codicon codicon-search";

                            row.appendChild(text);
                            row.appendChild(icon);
                            historyDiv.appendChild(row);

                            row.onclick = () => {
                                // Set input
                                input.value = item;
                                state.search = item;

                                // Move clicked item to top of history
                                state.history = state.history.filter(h => h !== item);
                                state.history.push(item);

                                vscode.setState(state);

                                // Trigger search
                                vscode.postMessage({
                                    type: 'search',
                                    value: item
                                });

                                renderHistory();

                                // Scroll to top
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            };
                        });
                    }

                    // Reset from extension
                    window.addEventListener('message', event => {
                        if (event.data.type === "resetState") {
                            state.search = "";
                            state.history = [];
                            vscode.setState(state);

                            input.value = "";
                            renderHistory();
                        }
                    });

                    renderHistory();

                    // Input event
                    input.addEventListener('input', () => {
                        const value = input.value;
                        state.search = value;
                        vscode.setState(state);

                        vscode.postMessage({
                            type: 'search',
                            value
                        });

                        // Debounce history update
                        clearTimeout(historyTimer);

                        historyTimer = setTimeout(() => {
                            const finalValue = value.trim();
                            if (!finalValue) return;

                            // Remove existing duplicate (exact match)
                            state.history = state.history.filter(h => h !== finalValue);

                            // Add new value to the end (so reverse() puts it on top)
                            state.history.push(finalValue);

                            // Limit history size
                            if (state.history.length > historyLength) {
                                state.history.shift();
                            }

                            vscode.setState(state);
                            renderHistory();
                        }, historyTimerTimeout);
                    });


                    // Reset button
                    resetBtn.addEventListener('click', () => {
                        input.value = "";
                        state.search = "";
                        // state.history = [];
                        vscode.setState(state);

                        vscode.postMessage({ type: 'reset' });
                        renderHistory();
                    });
                </script>


            </body>
        </html>
        `;
    }
}
