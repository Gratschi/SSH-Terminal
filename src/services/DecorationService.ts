import vscode from "vscode";
import StorageService from "./StorageService";
import MultiRegex from "./MultiRegex";
import { WarnType } from "../utils/types";

// TODO: create upper class
export default class DecorationService {
  private readonly collection: vscode.TextEditorDecorationType;
  private decorations: vscode.DecorationOptions[];
  private editor: vscode.TextEditor | undefined;

  constructor(private readonly storage: StorageService) {
    this.collection = vscode.window.createTextEditorDecorationType({ });
    this.decorations = new Array<vscode.DecorationOptions>();
  }

  public show(editor: vscode.TextEditor): void {
    const document = editor.document;
    this.storage.parseJson<any>(document.getText())
      .then(json => {
        if (json == null) return;

        const terminals = json[`terminal.integrated.profiles.${StorageService.PLATFORM}`] ?? undefined;
        if (terminals == null) return;

        // vscode terminals with ssh in it
        const entries = Object.entries(terminals).filter(([_, terminal]) => (terminal != null && typeof terminal === "object" && "ssh" in terminal)) as [string, object][];
        this.create(editor);

        // TODO: refactor this should return diagnostics
        entries.forEach(([name]) => {
          this.validateTerminal(name);
        });

        this.update();
      })
      .catch(() => {});
  }

  private create(editor: vscode.TextEditor): void {
    this.clear();
    this.editor = editor;
  }

  private update(): void {
    if (this.editor == null) return;

    this.editor.setDecorations(this.collection, this.decorations);
  }

  private clear(): void {
    this.decorations = new Array<vscode.DecorationOptions>();
    this.editor = undefined;
  }

  private validateTerminal(name: string): void {
    this.addHints(name);
  }

  private hint(keys: string[], message: string): void {
    if (this.editor == null || keys.length === 0) return;

    const terminalsKey = `terminal.integrated.profiles.${StorageService.PLATFORM}`;
    const keyPosition = this.findFilePosition(this.editor.document, [terminalsKey, ...keys], "both");
    if (!keyPosition) return;

    this.addDecoration(keyPosition[0], message);
    this.addDecoration(keyPosition[1], message);
  }

  private addHints(name: string): void {
    this.hint([name, "ssh"], "An optional object that represents the configuration settings for an SSH connection. (Extension: SSH-Terminal)");
    this.hint([name, "ssh", "host"], "The hostname or IP address of the remote server.");
    this.hint([name, "ssh", "user"], "The username for SSH authentication.");
    this.hint([name, "ssh", "port"], "The SSH port to connect to. Defaults to port 22 if not provided.");
    this.hint([name, "ssh", "password"], "The password used for SSH authentication.");
    this.hint([name, "ssh", "crypted"], "A boolean indicating whether the password is encrypted (true) or plain text (false). \n\nIt is recommended to use an SSH key (key) instead of a password for enhanced security.");
    this.hint([name, "ssh", "key"], "The file path to the SSH private key for key-based authentication.");
  }

  private addDecoration(position: vscode.Range, message: string): void {
    const diagnostic: vscode.DecorationOptions = {
      range: position,
      hoverMessage: message,
    };

    this.decorations.push(diagnostic);
  }

  // TODO: refactor this that it also checks for multiple patterns (only checks document a single time)
  private findFilePosition(document: vscode.TextDocument, keys: string[], warnType: WarnType = "key", closestLine: number = 0, closestIndent: number = 0): vscode.Range[] | undefined {
    if (keys.length === 0) return;

    const lines = document.getText().split("\n");
    const firstKey = keys.shift();
    // ("overrideName")\s*:\s*([{["tfn0-9][^,]*),?
    const pattern = new MultiRegex(`("${firstKey}")\\s*:\\s*([{["tfn0-9][^,]*),?`);
    
    let bracesCount = 0;
    for (let line = closestLine; line < lines.length; line++) {
      if (bracesCount < 0) return;
  
      // only check closestIndent if match happened on the same line as the last one
      const lineText = (line === closestLine) ? lines[line].substring(closestIndent) : lines[line];
  
      // count closing against opening brackets to check if it's already out of scope
      const openBraces = lineText.split("{").length - 1;
      const closeBraces = lineText.split("}").length - 1;
      bracesCount += openBraces - closeBraces;

      const match = pattern.exec(lineText);
      if (!match || match.length !== 3) continue;

      if (keys.length !== 0) {
        return this.findFilePosition(document, keys, warnType, line, match[0].start);
      }

      const ret = new Array<vscode.Range>();
      switch (warnType) {
        case "key": {
          const { start, end } = match[1];
          ret.push(new vscode.Range(
            new vscode.Position(line, (line === closestLine) ? (closestIndent + start) : start),
            new vscode.Position(line, (line === closestLine) ? (closestIndent + end) : end)
          ));
          break;
        }
        case "value": {
          const { start, end } = match[2];
          ret.push(new vscode.Range(
            new vscode.Position(line, (line === closestLine) ? (closestIndent + start) : start),
            new vscode.Position(line, (line === closestLine) ? (closestIndent + end) : end)
          ));
          break;
        }
        default: {
          const { start: startKey, end: endKey } = match[1];
          ret.push(new vscode.Range(
            new vscode.Position(line, (line === closestLine) ? (closestIndent + startKey) : startKey),
            new vscode.Position(line, (line === closestLine) ? (closestIndent + endKey) : endKey)
          ));

          const { start: startValue, end: endValue } = match[2];
          ret.push(new vscode.Range(
            new vscode.Position(line, (line === closestLine) ? (closestIndent + startValue) : startValue),
            new vscode.Position(line, (line === closestLine) ? (closestIndent + endValue) : endValue)
          ));
          break;
        }
      }

      return ret;
    }
  }
}