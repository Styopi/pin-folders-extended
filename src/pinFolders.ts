import * as vscode from 'vscode';
import * as path from 'path';
import { SearchResultItem } from './searchResultItem';
import { SearchResultsProvider } from './searchResultsProvider';

type EnsureNodeFn = (
	fsPath: string,
	label: string,
	isDirectory: boolean,
	parent?: SearchResultItem,
	collapsible?: vscode.TreeItemCollapsibleState
) => SearchResultItem;

export class PinFoldersTreeDataProvider implements vscode.TreeDataProvider<PinTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<PinTreeItem | undefined | void> = new vscode.EventEmitter<PinTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<PinTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	private pinnedFolders: Array<[vscode.Uri, string]>;
	private lastSearchQuery: string | null = null
	private globalState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	private folderStates = new Map<string, vscode.TreeItemCollapsibleState>();
	private forceDynamicIds = false;

	constructor(
		workspaceRoot: Array<[string, string]>,
		private readonly searchResultsProvider: SearchResultsProvider
	) {
		this.pinnedFolders = this.getPinnedFolders(workspaceRoot);
	}

	getParent(element: PinTreeItem): PinTreeItem | null {
		return null;
	}

	public updateWorksapaceRoot(workspaceRoot: Array<[string, string]>) {
		this.pinnedFolders = this.getPinnedFolders(workspaceRoot);
	}

	private getPinnedFolders(workspaceRoot: [string, string][]): [vscode.Uri, string][] {
		return workspaceRoot.map(x => [vscode.Uri.file(x[0]), x[1]]);
	}

	refresh(): void {
		// console.log('*** Refresh ***');
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: PinTreeItem): vscode.TreeItem {
		return element;
	}

	getState(): vscode.TreeItemCollapsibleState {
		return this.globalState;
	}

	refreshSearchResults() {
		if (this.lastSearchQuery) { this.search(this.lastSearchQuery); }
	}

	async getChildren(element?: PinTreeItem): Promise<PinTreeItem[]> {
		// console.log('*** getChildren');
		if (this.pinnedFolders.length === 0) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return [];
		}

		if (element) {
			return this.getFilesinDirectory(element);
		}

		var ret = await Promise.all(this.pinnedFolders.map(async (item) => {
			try {
				const uri = item[0];
				const stat = await vscode.workspace.fs.stat(uri);
				const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;

				if ((stat.type & vscode.FileType.Directory) === vscode.FileType.Directory) {
					return new PinTreeItem(
						true,
						uri,
						collapsedState,
						undefined,
						item[1],
						this.forceDynamicIds
					);
				} else {
					const command = {
						command: 'vscode.open',
						title: 'open',
						arguments: [uri]
					};
					return new PinTreeItem(
						false,
						uri,
						collapsedState,
						command,
						item[1] + " (missing)",
						this.forceDynamicIds
					);
				}
			} catch (error) {
				return null;
			}
		}));

		let items = ret.filter(x => x !== null) as PinTreeItem[];

		return items;
	}

	private async getFilesinDirectory(element: PinTreeItem): Promise<PinTreeItem[]> {
		if (!element.isDirectory) {
			return [];
		}

		// console.log('*** getFilesinDirectory');

		const entries = await vscode.workspace.fs.readDirectory(element.uri);

		let items = entries.map(([name, type]) => {
			const isDirectory = (type & vscode.FileType.Directory) === vscode.FileType.Directory;
			const subUri = vscode.Uri.joinPath(element.uri, name);
			const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;

			if (isDirectory) {
				return new PinTreeItem(
					true,
					subUri,
					collapsedState
				);
			} else {
				const command = {
					command: 'vscode.open',
					title: 'open',
					arguments: [subUri]
				};
				return new PinTreeItem(
					false,
					subUri,
					vscode.TreeItemCollapsibleState.None,
					command
				);
			}
		});

		return items;
	}

	toStringLabel(label: string | vscode.TreeItemLabel | undefined): string {
		if (typeof label === "string") return label;
		if (label && typeof label.label === "string") return label.label;
		return "";
	}

	async search(query: string): Promise<void> {
		this.lastSearchQuery = query;
		const items = await this.getChildren();
		const tree = new Map<string, SearchResultItem>();

		const ensureNode = (
			fsPath: string,
			label: string,
			isDirectory: boolean,
			parent?: SearchResultItem,
			collapsible: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
		): SearchResultItem => {
			const key = fsPath;

			if (tree.has(key)) {
				const existing = tree.get(key)!;

				if (parent && !existing.parent) {
					existing.parent = parent;
					parent.children.push(existing);
				}

				return existing;
			}

			const uri = vscode.Uri.file(fsPath);

			const item = new SearchResultItem(
				label,
				uri,
				isDirectory,
				parent,
				collapsible
			);

			if (parent) {
				item.parent = parent;
				parent.children.push(item);
			}

			tree.set(key, item);
			return item;
		};

		for (const folder of items) {
			if (!folder.isDirectory) continue;

			await this.buildFolderResults(folder, query, tree, ensureNode);
			await this.buildFileResults(folder, query, tree, ensureNode);
		}

		const roots = [...tree.values()].filter(item => !item.parent);
		this.searchResultsProvider.setResults(roots);
	}

	private async buildFolderResults(
		folder: PinTreeItem,
		query: string,
		tree: Map<string, SearchResultItem>,
		ensureNode: EnsureNodeFn
	) {
		const matchedFolders = await this.searchRecursive(folder, query, true);

		for (const dir of matchedFolders) {
			const fsPath = dir.uri.fsPath;

			const pinnedRoot = this.pinnedFolders.find(([uri]) =>
				fsPath.startsWith(uri.fsPath)
			);
			if (!pinnedRoot) continue;

			const [pinnedRootUri, pinnedRootLabel] = pinnedRoot;
			const pinnedPath = pinnedRootUri.fsPath;

			const rootNode = ensureNode(
				pinnedPath,
				pinnedRootLabel,
				true,
				undefined,
				vscode.TreeItemCollapsibleState.Expanded
			);

			const relative = fsPath.substring(pinnedPath.length);
			const parts = relative.split(path.sep).filter(Boolean);

			let parent = rootNode;

			for (let i = 0; i < parts.length; i++) {
				const currentPath = path.join(pinnedPath, ...parts.slice(0, i + 1));

				parent = ensureNode(
					currentPath,
					parts[i],
					true,
					parent,
					vscode.TreeItemCollapsibleState.Expanded
				);
			}

			const children = await this.getChildren(dir);

			for (const child of children) {
				const childPath = child.uri.fsPath;

				ensureNode(
					childPath,
					this.toStringLabel(child.label),
					child.isDirectory,
					parent,
					child.isDirectory
						? vscode.TreeItemCollapsibleState.Expanded
						: vscode.TreeItemCollapsibleState.None
				);
			}
		}
	}

	private async buildFileResults(
		folder: PinTreeItem,
		query: string,
		tree: Map<string, SearchResultItem>,
		ensureNode: EnsureNodeFn
	) {
		const matchedFiles = await this.searchRecursive(folder, query, false);

		for (const file of matchedFiles) {
			const fsPath = file.uri.fsPath;

			const pinnedRoot = this.pinnedFolders.find(([uri]) =>
				fsPath.startsWith(uri.fsPath)
			);
			if (!pinnedRoot) continue;

			const [pinnedRootUri, pinnedRootLabel] = pinnedRoot;
			const pinnedPath = pinnedRootUri.fsPath;

			const rootNode = ensureNode(
				pinnedPath,
				pinnedRootLabel,
				true,
				undefined,
				vscode.TreeItemCollapsibleState.Expanded
			);

			const relative = fsPath.substring(pinnedPath.length);
			const parts = relative.split(path.sep).filter(Boolean);

			let parent = rootNode;

			for (let i = 0; i < parts.length; i++) {
				const isLast = i === parts.length - 1;
				const currentPath = path.join(pinnedPath, ...parts.slice(0, i + 1));

				parent = ensureNode(
					currentPath,
					parts[i],
					!isLast,
					parent,
					isLast
						? vscode.TreeItemCollapsibleState.None
						: vscode.TreeItemCollapsibleState.Expanded
				);
			}
		}
	}

	async searchRecursive(
		folder: PinTreeItem,
		query: string,
		foldersOnly: boolean
	): Promise<PinTreeItem[]> {

		const results: PinTreeItem[] = [];
		const label = folder.label?.toString().toLowerCase() ?? "";

		if (foldersOnly) {
			if (label.includes(query)) {
				results.push(folder);
				return results;
			}

			const children = await this.getFilesinDirectory(folder);
			for (const child of children) {
				if (child.isDirectory) {
					const deeper = await this.searchRecursive(child, query, true);
					results.push(...deeper);
				}
			}

			return results;
		}

		const children = await this.getFilesinDirectory(folder);

		for (const child of children) {
			const childLabel = child.label?.toString().toLowerCase() ?? "";

			if (!child.isDirectory && childLabel.includes(query)) {
				results.push(child);
			}

			if (child.isDirectory) {
				const deeper = await this.searchRecursive(child, query, false);
				results.push(...deeper);
			}
		}

		return results;
	}

	public handleDrag(source: PinTreeItem[], target: PinTreeItem | undefined): void {
		if (!target) {
			return;
		}

		// Only allow reordering at root level
		if (target.contextValue !== 'pinnedFolder' || source[0].contextValue !== 'pinnedFolder') {
			return;
		}

		const sourceIndex = this.pinnedFolders.findIndex(([uri]) => uri.fsPath === source[0].uri.fsPath);
		const targetIndex = this.pinnedFolders.findIndex(([uri]) => uri.fsPath === target.uri.fsPath);

		if (sourceIndex === -1 || targetIndex === -1) {
			return;
		}

		// Move the item to new position
		const [movedItem] = this.pinnedFolders.splice(sourceIndex, 1);
		this.pinnedFolders.splice(targetIndex, 0, movedItem);

		// Update global state and refresh
		const newPinnedFolders = this.pinnedFolders.map(([uri, name]) => [uri.fsPath, name]);
		vscode.commands.executeCommand('pinned-folders.updateOrder', newPinnedFolders);
	}

}

export class PinTreeItem extends vscode.TreeItem {
	public draggable?: boolean;

	constructor(
		public readonly isDirectory: boolean,
		public readonly uri: vscode.Uri,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
		public readonly name?: string,
		public readonly forceDynamicId: boolean = false,
		public descriptionText?: string
	) {
		var givenName = name ?? path.basename(uri.fsPath);
		super(givenName, collapsibleState);
		this.tooltip = uri.fsPath;
		this.uri = uri;
		this.resourceUri = uri;
		this.description = givenName === path.basename(uri.fsPath) ? '' : path.basename(uri.fsPath);

		if (descriptionText) {
			this.label = givenName;
			this.description = descriptionText;
		}
		this.command = command;
		// Name is sent only for pinned folders and not for subfolders
		// so we can differentiate between them without extra flag
		if (name) {
			this.contextValue = 'pinnedFolder';
			this.draggable = true;
			this.iconPath = new vscode.ThemeIcon(
				"bookmark",
				new vscode.ThemeColor("terminal.ansiBrightRed")
			);
		} else {
			this.contextValue = 'subFolder';
			this.draggable = false;
		}

		this.id = uri.fsPath;
	}
}

