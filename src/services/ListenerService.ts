import vscode from "vscode";
import TextDocumentListener from "./TextDocumentListener";
import SSHTerminalService from "./SSHTerminalService";
import MessageHandler from "./MessageHandler";
import StorageService from "./StorageService";

export default class ListenerService {
  constructor(private readonly sshTerminalService: SSHTerminalService) { }

  public onDidChangeActiveTerminal(): vscode.Disposable {
    return vscode.window.onDidChangeActiveTerminal(terminal => {
      if (!terminal) return;

      this.sshTerminalService.terminal.connectTerminal(terminal);
    });
  }

  public onDidSaveConfigFile(): vscode.Disposable {
    return TextDocumentListener.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
      const res = await this.sshTerminalService.config.saveConfig(document.getText(), document.fileName);
      if (res == null) return;

      MessageHandler.infoTerminalSave(res);
    }, { once: true, pattern: /\/settings\.json$/ });
  }

  public onDiagnostics(): vscode.Disposable {
    return this.sshTerminalService.validator.diagnostics.collection;
  }

  public syntaxCheckConfigFile(): vscode.Disposable {
    // TODO: add pattern /\/settings\.json$/ and delay
    return TextDocumentListener.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      console.log("document changed!");
      
      const document = event.document;

      this.sshTerminalService.storage.parseJson<any>(document.getText())
        .then(json => {
          if (json == null) return;

          const terminals = json[`terminal.integrated.profiles.${StorageService.PLATFORM}`] ?? undefined;
          if (terminals == null) return;

          // vscode terminals with ssh in it
          const entries = Object.entries(terminals).filter(([_name, terminal]) => (terminal != null && typeof terminal === "object" && "ssh" in terminal)) as [string, object][];
          this.sshTerminalService.validator.diagnostics.create(document);

          entries.forEach(([name, terminal]) => {
            this.sshTerminalService.validator.validateDiagnosticTerminal(terminal, name);
          });

          this.sshTerminalService.validator.diagnostics.update();
        })
        .catch(() => {});
    });
  }
}