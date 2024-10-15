import vscode from "vscode";
import StorageService from "./StorageService";
import { isStringArray } from "../utils/default";
import VariableWatcher from "./VariableWatcher";

// TODO: mb refactor pattern to globpattern
// TODO: check if options are valid for each callback
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const TextDocumentListener = (() => {
  let changedFiles = new Array<string>();
  const variableWatcher = VariableWatcher.getInstance({ activeTerminal: undefined });

  function _onDidSaveTextDocument(listener: (document: vscode.TextDocument) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
    if (!options?.once) {
      return vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        if (!_isValid(document, options)) return;

        listener(document);
      }, null, disposables);
    }

    // once
    const saveDisposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      if (!_isValid(document, options) || !changedFiles.includes(document.fileName)) return;

      listener(document);
      // remove file from list
      changedFiles = changedFiles.filter(file => file !== document.fileName);
    });
    
    const newDisposables = disposables ? [saveDisposable, ...disposables] : [saveDisposable];
    return vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      if (!_isValid(event.document, options) || changedFiles.includes(event.document.fileName) || event.contentChanges.length === 0) return;

      changedFiles.push(event.document.fileName);
    }, null, newDisposables);
  }

  // TODO: add options to not fire every single time (delay, remove once (only required for saving))
  function _onDidChangeTextDocument(listener: (event: vscode.TextDocumentChangeEvent) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
    return vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      if (!_isValid(event.document, options)) return;

      listener(event);
    }, null, disposables);
  }

  function _onDidChangeActiveTextEditor(listener: (event: vscode.TextEditor | undefined) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
    const mountActiveTerminal = variableWatcher.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
      if (event && !_isValid(event.document, options)) return;

      listener(event);
    });

    const newDisposables = disposables ? [mountActiveTerminal, ...disposables] : [mountActiveTerminal];
    return vscode.window.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
      if (event && !_isValid(event.document, options)) return;

      listener(event);
    }, null, newDisposables);
  }

  function _isValid(document: vscode.TextDocument, options?: vscode.TextDocumentOptions | null): boolean {
    if (options == null) return true;

    const pattern = options.pattern;
    const fileNames = options.fileNames;
    const languageId = options.language;
    const documentFileName = document.fileName.replaceAll(/\\/g, "/");
    const documentFileNameWindows = document.fileName.replaceAll(/\//g, "\\");

    // check pattern
    if (pattern) {
      const regex = new RegExp(pattern);
      if (!documentFileName.match(regex) && !documentFileNameWindows.match(regex)) return false;

      return true;
    }

    // check language
    if (languageId && (document.languageId !== languageId)) return false;
    // check filename
    if (fileNames && typeof fileNames === "string" && !StorageService.comparePath(fileNames, documentFileName)) return false;
    if (fileNames && isStringArray(fileNames) && !fileNames.some(fileName => StorageService.comparePath(fileName, documentFileName))) return false;

    return true;
  }
  
  return {
    onDidSaveTextDocument(listener: (document: vscode.TextDocument) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
      return _onDidSaveTextDocument(listener, options, disposables);
    },
    onDidChangeTextDocument(listener: (event: vscode.TextDocumentChangeEvent) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
      return _onDidChangeTextDocument(listener, options, disposables);
    },
    onDidChangeActiveTextEditor(listener: (event: vscode.TextEditor | undefined) => void, options?: vscode.TextDocumentOptions | null, disposables?: vscode.Disposable[]): vscode.Disposable {
      return _onDidChangeActiveTextEditor(listener, options, disposables);
    }
  };
})();

export default TextDocumentListener;