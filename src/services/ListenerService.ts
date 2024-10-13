import vscode from "vscode";
import TextDocumentListener from "./TextDocumentListener";
import SSHTerminalService from "./SSHTerminalService";
import MessageHandler from "./MessageHandler";

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

  public syntaxCheckConfigFile(): vscode.Disposable {
    return TextDocumentListener.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      const document = event.document;

      this.sshTerminalService.diagnostics.validateTerminals(document);
    }, { pattern: /\/settings\.json$/ }, [this.sshTerminalService.diagnostics.collection]);
  }
}