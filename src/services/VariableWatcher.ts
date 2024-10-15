import vscode from "vscode";

type VariableWatcherType = {
  activeTerminal: vscode.TextEditor | undefined,
};

export default class VariableWatcher {
  private static instance: VariableWatcher;
  private _activeTerminal: vscode.TextEditor | undefined;
  private _onDidChangeActiveTerminal = new vscode.EventEmitter<vscode.TextEditor | undefined>();

  private constructor(initial: VariableWatcherType) {
    this._activeTerminal = initial.activeTerminal;
  }

  public get activeTerminal(): vscode.TextEditor | undefined {
    return this._activeTerminal;
  }

  public set activeTerminal(newValue: vscode.TextEditor | undefined) {
    if (this._activeTerminal !== newValue) {
      this._activeTerminal = newValue;
      this._onDidChangeActiveTerminal.fire(this._activeTerminal);
    }
  }

  public static getInstance(initial: VariableWatcherType): VariableWatcher {
    if (!VariableWatcher.instance) {
      VariableWatcher.instance = new VariableWatcher(initial);
    }
    return VariableWatcher.instance;
  }

  public onDidChangeActiveTextEditor(listener: (event: vscode.TextEditor | undefined) => void): vscode.Disposable {
    return this._onDidChangeActiveTerminal.event(listener);
  }

  public dispose(): void {
    this._onDidChangeActiveTerminal.dispose();
  }
}