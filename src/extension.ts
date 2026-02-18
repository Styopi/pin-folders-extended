import * as vscode from 'vscode';
import { PinFoldersTreeDataProvider, PinTreeItem } from './pinFolders';
import { PinnedFoldersSearchViewProvider } from './searchView';
import { SearchResultsProvider } from './searchResultsProvider';
import { PinnedDragAndDropController } from './dragAndDropController';
import path from 'path';
import os = require("os");

var hostname = os.hostname();

export async function pickDirectoryToImport(): Promise<([string, string] | undefined)> {
	const importUri = await vscode.window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: true,
		title: "Select Folder To Pin in folders",
		canSelectMany: false,
		openLabel: "Select Folder To Pin in folders"
	});
	if (importUri?.length === 0) { return; }
	const folder = importUri![0];
	if (!folder?.fsPath) { return; }
	const defaultName = path.basename(folder.fsPath);
	const name = await vscode.window.showInputBox({
		title: "Pick Name (used when multiple pinned folders with same name)",
		ignoreFocusOut: true,
		value: defaultName
	});
	return [folder.fsPath, name ?? defaultName];
}

const pinFoldersSub = `pinned-folders`;

const pinFoldersSubKey = `${hostname}-${pinFoldersSub}`;
async function addEntry(context: vscode.ExtensionContext) {
	var folder = await pickDirectoryToImport();
	if (folder) {
		var pinnedFolders: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
		pinnedFolders.push(folder);
		context.workspaceState.update(pinFoldersSubKey, pinnedFolders);
		vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	// console.log("* EXTENSION ACTIVATED");
	const searchResultsProvider = new SearchResultsProvider();
	var folderList: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
	const alwaysTreeItemProvider = new PinFoldersTreeDataProvider(
		folderList,
		searchResultsProvider
	);

	// Watchers
	let pinnedFolderWatchers: vscode.FileSystemWatcher[] = [];

	function registerWatchersForPinnedFolders(folders: Array<[string, string]>) {
		// console.log('*** Register watchers');
		// Disable old watcher
		pinnedFolderWatchers.forEach(w => w.dispose());
		pinnedFolderWatchers = [];

		for (const [folderPath] of folders) {
			const pattern = new vscode.RelativePattern(folderPath, '**/*');
			const watcher = vscode.workspace.createFileSystemWatcher(pattern);

			watcher.onDidCreate(() => alwaysTreeItemProvider.refresh());
			watcher.onDidDelete(() => alwaysTreeItemProvider.refresh());
			watcher.onDidChange(() => alwaysTreeItemProvider.refresh());

			pinnedFolderWatchers.push(watcher);
		}
	}

	// Add watcher on plugin activation
	registerWatchersForPinnedFolders(folderList);
	alwaysTreeItemProvider.refresh();

	const refreshEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.refreshEntry`, () => {
		const pinnedFolders: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
		alwaysTreeItemProvider.updateWorksapaceRoot(pinnedFolders);
		alwaysTreeItemProvider.refresh();
		registerWatchersForPinnedFolders(pinnedFolders);
	});

	const removeEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.removeEntry`, async (item: PinTreeItem) => {
		const pinnedFolders: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
		const index = pinnedFolders.findIndex(x => x[0] === item.uri.fsPath);
		if (index !== -1) {
			pinnedFolders.splice(index, 1);
			context.workspaceState.update(pinFoldersSubKey, pinnedFolders);
			vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
		}
	});

	const renameEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.renameEntry`, async (item: PinTreeItem) => {
		const pinnedFolders: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
		const index = pinnedFolders.findIndex(x => x[0] === item.uri.fsPath);
		if (index !== -1) {
			const folder = pinnedFolders[index];
			const name = await vscode.window.showInputBox({
				title: "Pick Name (used when multiple pinned folders with same name)",
				ignoreFocusOut: true,
				value: folder[1]
			});
			if (name) {
				pinnedFolders[index] = [folder[0], name];
				context.workspaceState.update(pinFoldersSubKey, pinnedFolders);
				vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
			}
		}
	});

	// Add entry from workspace explorer 
	const addEntryFromExplorer = vscode.commands.registerCommand('pinned-folders.addEntryFromExplorer', async (uri: vscode.Uri) => {
		const name = await vscode.window.showInputBox({
			title: "Pick Name (used when multiple pinned folders with same name)",
			ignoreFocusOut: true,
			value: path.basename(uri.fsPath)
		});
		const folder: [string, string] = [uri.fsPath, name ?? path.basename(uri.fsPath)];
		var pinnedFolders: Array<[string, string]> = context.workspaceState.get(pinFoldersSubKey) ?? [];
		pinnedFolders.push(folder);
		context.workspaceState.update(pinFoldersSubKey, pinnedFolders);
		vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
	});

	const addEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.addEntry`, () => addEntry(context));

	const openInNewWindowCommand = vscode.commands.registerCommand(`${pinFoldersSub}.openInNewWindow`, async (item: PinTreeItem) => {
		vscode.commands.executeCommand('vscode.openFolder', item.uri, true);
	});

	const updateOrderCommand = vscode.commands.registerCommand('pinned-folders.updateOrder', (newOrder: Array<[string, string]>) => {
		context.workspaceState.update(pinFoldersSubKey, newOrder);
		alwaysTreeItemProvider.updateWorksapaceRoot(newOrder);
		alwaysTreeItemProvider.refresh();
	});

	// Register drag and drop handler
	vscode.window.createTreeView(pinFoldersSub, {
		treeDataProvider: alwaysTreeItemProvider,
		dragAndDropController: {
			dropMimeTypes: ['application/vnd.code.tree.pinned-folders'],
			dragMimeTypes: ['application/vnd.code.tree.pinned-folders'],
			handleDrag: (source: readonly vscode.TreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken) => {
				dataTransfer.set('application/vnd.code.tree.pinned-folders', new vscode.DataTransferItem(source));
			},
			handleDrop: async (target: vscode.TreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken) => {
				const transferItem = await dataTransfer.get('application/vnd.code.tree.pinned-folders');
				const sources = transferItem?.value as vscode.TreeItem[];
				alwaysTreeItemProvider.handleDrag(sources as PinTreeItem[], target as PinTreeItem);
			}
		}
	});

	// --- Create File / Folder ---
	const createEntryCommand = vscode.commands.registerCommand("pinned-folders.createEntry", async (item: PinTreeItem) => {
		const name = await vscode.window.showInputBox({
			title: "Create File or Folder",
			prompt: "Enter name (with extension for file, without for folder)",
			ignoreFocusOut: true
		});

		if (!name) {
			return;
		}

		const newUri = vscode.Uri.joinPath(item.uri, name);

		try {
			if (name.includes(".")) {
				// Create file
				await vscode.workspace.fs.writeFile(newUri, new Uint8Array());
				vscode.window.showInformationMessage(`Created file: ${name}`);
			} else {
				// Create folder
				await vscode.workspace.fs.createDirectory(newUri);
				vscode.window.showInformationMessage(`Created folder: ${name}`);
			}

			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();

		} catch (err) {
			vscode.window.showErrorMessage(`Failed to create: ${err}`);
		}
	});

	// --- Rename File ---
	const renameFileCommand = vscode.commands.registerCommand("pinned-folders.renameFile", async (item: PinTreeItem) => {
		// console.log('*** renameFileCommand');

		const newName = await vscode.window.showInputBox({
			title: "Rename File",
			prompt: "Enter new file name",
			value: path.basename(item.uri.fsPath),
			ignoreFocusOut: true
		});

		if (!newName) {
			return;
		}

		const targetUri = vscode.Uri.joinPath(
			item.uri.with({ path: path.dirname(item.uri.fsPath) }),
			newName
		);

		try {
			await vscode.workspace.fs.rename(item.uri, targetUri, { overwrite: false });
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
			vscode.window.showInformationMessage(`Renamed to: ${newName}`);
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to rename: ${err}`);
		}
	});

	// --- Copy File ---
	const pickTargetFolder = async function (oldUri: vscode.Uri): Promise<vscode.Uri | null> {
		const result = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: "Select target folder"
		});

		if (!result || result.length === 0) return null;

		const targetFolder = result[0];
		return targetFolder;
	};

	const copyFileCommand = vscode.commands.registerCommand(
		"pinned-folders.copyFile",
		async (item: PinTreeItem) => {

			const folder = await pickTargetFolder(item.uri);
			if (!folder) return;

			const newName = await vscode.window.showInputBox({
				title: "Copy File",
				prompt: "Enter name for copied file",
				value: path.basename(item.uri.fsPath),
				ignoreFocusOut: true
			});

			if (!newName) {
				return;
			}

			const targetUri = vscode.Uri.joinPath(folder, newName);

			try {
				await vscode.workspace.fs.copy(item.uri, targetUri, { overwrite: false });
				vscode.commands.executeCommand("pinned-folders.refreshEntry");
				alwaysTreeItemProvider.refreshSearchResults();
				vscode.window.showInformationMessage(`Copied to: ${targetUri.fsPath}`);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to copy: ${err}`);
			}
		}
	);

	// --- Move File/Dir ---
	const moveFileCommand = vscode.commands.registerCommand(
		"pinned-folders.moveFile",
		async (item: PinTreeItem) => {

			const oldUri = item.uri;

			const folder = await pickTargetFolder(oldUri);
			if (!folder) return;

			const name = path.basename(oldUri.fsPath);

			const targetUri = vscode.Uri.joinPath(folder, name);

			try {
				await vscode.workspace.fs.rename(oldUri, targetUri, { overwrite: false });

				vscode.commands.executeCommand("pinned-folders.refreshEntry");
				alwaysTreeItemProvider.refreshSearchResults();

				vscode.window.showInformationMessage(`Moved to: ${targetUri.fsPath}`);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to move: ${err}`);
			}
		}
	);


	// --- Delete File ---
	const deleteFileCommand = vscode.commands.registerCommand("pinned-folders.deleteFile", async (item: PinTreeItem) => {
		const fileName = path.basename(item.uri.fsPath);

		let stat;
		try {
			stat = await vscode.workspace.fs.stat(item.uri);
		} catch (err) {
			vscode.window.showErrorMessage(`Cannot access: ${fileName}`);
			return;
		}

		const isDirectory = stat.type === vscode.FileType.Directory;

		const confirm = await vscode.window.showWarningMessage(
			isDirectory
				? `Delete folder "${fileName}" and all its contents?`
				: `Delete file "${fileName}"?`,
			{ modal: true },
			"Delete"
		);

		if (confirm !== "Delete") {
			return;
		}

		try {
			await vscode.workspace.fs.delete(item.uri, { recursive: isDirectory });
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
			vscode.window.showInformationMessage(
				isDirectory
					? `Deleted folder: ${fileName}`
					: `Deleted file: ${fileName}`
			);
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to delete: ${err}`);
		}
	});

	// --- Drag & Drop ---
	const pinnedDnd = new PinnedDragAndDropController(
		async (source, target) => {
			await vscode.workspace.fs.rename(source, target, { overwrite: false });
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
		},
		async (source, target) => {
			const data = await vscode.workspace.fs.readFile(source);
			await vscode.workspace.fs.writeFile(target, data);
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
		}
	);

	vscode.window.createTreeView("pinned-folders", {
		treeDataProvider: alwaysTreeItemProvider,
		dragAndDropController: pinnedDnd
	});


	// Search results
	const searchDnd = new PinnedDragAndDropController(
		async (source, target) => {
			await vscode.workspace.fs.rename(source, target, { overwrite: false });
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
		},
		async (source, target) => {
			const data = await vscode.workspace.fs.readFile(source);
			await vscode.workspace.fs.writeFile(target, data);
			vscode.commands.executeCommand("pinned-folders.refreshEntry");
			alwaysTreeItemProvider.refreshSearchResults();
		}
	);

	vscode.window.createTreeView("pinned-folders-search-results", {
		treeDataProvider: searchResultsProvider,
		dragAndDropController: searchDnd
	});


	// --- Search File/Folder --- 
	vscode.window.createTreeView("pinned-folders-search-results", {
		treeDataProvider: searchResultsProvider
	});

	const searchProvider = new PinnedFoldersSearchViewProvider(async (value: string) => {

		if (!value || value.trim() === "") {
			vscode.commands.executeCommand("setContext", "pinnedFolders:hasSearchResults", false);
			searchResultsProvider.clear();
			return;
		}

		vscode.commands.executeCommand("setContext", "pinnedFolders:hasSearchResults", true);

		await alwaysTreeItemProvider.search(value.toLowerCase());
	});

	const searchView = vscode.window.registerWebviewViewProvider(
		"pinned-folders-search",
		searchProvider
	);

	context.subscriptions.push(
		refreshEntryCommand,
		removeEntryCommand,
		addEntryCommand,
		renameEntryCommand,
		addEntryFromExplorer,
		openInNewWindowCommand,
		updateOrderCommand,
		createEntryCommand,
		renameFileCommand,
		copyFileCommand,
		moveFileCommand,
		deleteFileCommand,
		searchView
	);
}

export function deactivate() { }
