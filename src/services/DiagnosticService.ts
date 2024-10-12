import vscode from "vscode";
import StorageService from "./StorageService";
import MultiRegex from "./MultiRegex";

export default class DiagnosticService {
  public readonly collection = vscode.languages.createDiagnosticCollection("sshTerminalDiagnostic");
  private diagnostics = new Array<vscode.Diagnostic>();
  private document: vscode.TextDocument | undefined;

  public create(document: vscode.TextDocument): void {
    this.clear();
    this.document = document;
  }

  public update(): void {
    if (this.document == null) return;

    this.collection.set(this.document.uri, this.diagnostics);
  }

  public clear(): void {
    this.collection.clear();
    this.diagnostics = new Array<vscode.Diagnostic>();
    this.document = undefined;
  }

  public missingKey(keys: string[], missingKey: string): void {
    if (this.document == null || keys.length === 0) return;

    const message = `SSH-Terminal Warning: Missing required key \"${missingKey}\"`;
    const keyPosition = this.findFilePosition(this.document, keys);
    if (!keyPosition) return;

    this.addDiagnostic(keyPosition, message, vscode.DiagnosticSeverity.Warning);
  }

  public invalidValue(keys: string[], type: "object" | "string" | "number" | "boolean" | string): void {
    if (this.document == null || keys.length === 0) return;
    
    const message = `SSH-Terminal Warning: Incorrect type. Expected "${type}".`;
    const keyPosition = this.findFilePosition(this.document, keys, true);
    if (!keyPosition) return;

    this.addDiagnostic(keyPosition, message, vscode.DiagnosticSeverity.Warning);
  }

  private addDiagnostic(position: vscode.Range, message: string, type: vscode.DiagnosticSeverity): void {
    const diagnostic = new vscode.Diagnostic(
      position,
      message,
      type,
    );

    this.diagnostics.push(diagnostic);
  }

  private findFilePosition(document: vscode.TextDocument, keys: string[], warnValue: boolean = false, closestSection: number = -1): vscode.Range | undefined {
    if (keys.length === 0) return;

    // TODO: check if work on single line json file

    const lines = document.getText().split("\n");
    const terminalsKey = `terminal.integrated.profiles.${StorageService.PLATFORM}`;
    const firstKey = keys.shift();
    const pattern = new MultiRegex(`(\"${firstKey}\")\\s*:\\s*([{["tfn0-9].*),?`);
    
    let bracesCount = 0;
    for (let line = 0; line < lines.length; line++) {
      if (bracesCount < 0) return;
  
      const lineText = lines[line];
  
      if (lineText.includes(terminalsKey)) {
        closestSection = line;
      }
      if (closestSection === -1 || line < closestSection) continue;
  
      // only check braces count after its in valid terminals section
      const openBraces = lineText.split("{").length - 1;
      const closeBraces = lineText.split("}").length - 1;
      bracesCount += openBraces - closeBraces;
  
      
      const match = pattern.exec(lineText);
      if (!match || match.length !== 3) continue;

      if (keys.length !== 0) {
        return this.findFilePosition(document, keys, warnValue, line + 1);
      }

      const { start, end } = (!warnValue) ? match[1] : match[2];
  
      return new vscode.Range(
        new vscode.Position(line, start),
        new vscode.Position(line, end)
      );
    }
  }
}