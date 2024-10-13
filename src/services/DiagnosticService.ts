import vscode from "vscode";
import StorageService from "./StorageService";
import MultiRegex from "./MultiRegex";

export default class DiagnosticService {
  public readonly collection = vscode.languages.createDiagnosticCollection("sshTerminalDiagnostic");
  private diagnostics = new Array<vscode.Diagnostic>();
  private document: vscode.TextDocument | undefined;

  constructor(private readonly storage: StorageService) { }

  public validateTerminals(document: vscode.TextDocument): void {
    this.storage.parseJson<any>(document.getText())
      .then(json => {
        if (json == null) return;

        const terminals = json[`terminal.integrated.profiles.${StorageService.PLATFORM}`] ?? undefined;
        if (terminals == null) return;

        // vscode terminals with ssh in it
        const entries = Object.entries(terminals).filter(([_, terminal]) => (terminal != null && typeof terminal === "object" && "ssh" in terminal)) as [string, object][];
        this.create(document);

        // TODO: refactor this should return diagnostics
        entries.forEach(([name, terminal]) => {
          this.validateTerminal(terminal, name);
        });

        this.update();
      })
      .catch(() => {});
  }

  private create(document: vscode.TextDocument): void {
    this.clear();
    this.document = document;
  }

  private update(): void {
    if (this.document == null) return;

    this.collection.set(this.document.uri, this.diagnostics);
  }

  private clear(): void {
    this.collection.clear();
    this.diagnostics = new Array<vscode.Diagnostic>();
    this.document = undefined;
  }

  private validateTerminal(terminal: object, name: string): void {
    this.isValidTerminal(terminal, name);
  }

  private missingKey(keys: string[], missingKey: string): void {
    if (this.document == null || keys.length === 0) return;

    const message = `SSH-Terminal Warning: Missing required key \"${missingKey}\"`;
    const terminalsKey = `terminal.integrated.profiles.${StorageService.PLATFORM}`;
    const keyPosition = this.findFilePosition(this.document, [terminalsKey, ...keys]);
    if (!keyPosition) return;

    this.addDiagnostic(keyPosition, message, vscode.DiagnosticSeverity.Warning);
  }

  private invalidValue(keys: string[], type: "object" | "array" | "string" | "number" | "boolean" | string): void {
    if (this.document == null || keys.length === 0) return;
    
    const message = `SSH-Terminal Warning: Incorrect type. Expected "${type}".`;
    const terminalsKey = `terminal.integrated.profiles.${StorageService.PLATFORM}`;
    const keyPosition = this.findFilePosition(this.document, [terminalsKey, ...keys], true);
    if (!keyPosition) return;

    this.addDiagnostic(keyPosition, message, vscode.DiagnosticSeverity.Warning);
  }

  private isValidTerminal(terminal: object, name: string): void {
    if (!("ssh" in terminal)) return;
    else if (typeof terminal.ssh !== "object" || terminal.ssh === null) {
      return this.invalidValue([name, "ssh"], "object");
    }

    // check required types
    if (!("overrideName" in terminal)) {
      this.missingKey([name], "overrideName");
    } else if (terminal.overrideName !== true) {
      this.invalidValue([name, "overrideName"], "true");
    }
    
    const ssh = terminal.ssh;

    // check required types
    if (!("host" in ssh)) {
      this.missingKey([name, "ssh"], "host");
    } else if (typeof ssh.host !== "string") {
      this.invalidValue([name, "ssh", "host"], "string");
    }
    if (!("user" in ssh)) {
      this.missingKey([name, "ssh"], "user");
    } else if (typeof ssh.user !== "string") {
      this.invalidValue([name, "ssh", "user"], "string");
    }

    // check non-required types
    if ("port" in ssh && typeof ssh.port !== "number") {
      this.invalidValue([name, "ssh", "port"], "number");
    };
    if ("password" in ssh && typeof ssh.password !== "string") {
      this.invalidValue([name, "ssh", "password"], "string");
    };
    if (!("password" in ssh) && "key" in ssh && typeof ssh.key !== "string" && !StorageService.isFile(ssh.key as string)) {
      this.invalidValue([name, "ssh", "key"], "File");
    };
  }

  private addDiagnostic(position: vscode.Range, message: string, type: vscode.DiagnosticSeverity): void {
    const diagnostic = new vscode.Diagnostic(
      position,
      message,
      type,
    );

    this.diagnostics.push(diagnostic);
  }

  // TODO: refactor this that it also checks for multiple patterns (only checks document a single time)
  private findFilePosition(document: vscode.TextDocument, keys: string[], warnValue: boolean = false, closestLine: number = 0, closestIndent: number = 0): vscode.Range | undefined {
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
        return this.findFilePosition(document, keys, warnValue, line, match[0].start);
      }

      const { start, end } = (!warnValue) ? match[1] : match[2];
  
      return new vscode.Range(
        new vscode.Position(line, (line === closestLine) ? (closestIndent + start) : start),
        new vscode.Position(line, (line === closestLine) ? (closestIndent + end) : end)
      );
    }
  }
}