import vscode from "vscode";
import TextDocumentListener from "./TextDocumentListener";
import SSHTerminalService from "./SSHTerminalService";
import MessageHandler from "./MessageHandler";

export default class ListenerService {
  constructor(private readonly sshTerminalService: SSHTerminalService) { }

  public onDidChangeActiveTerminal(): vscode.Disposable {
    return vscode.window.onDidChangeActiveTerminal(async (terminal) => {
      if (!terminal) return;
      
      const processId = await terminal.processId;
      if (!processId) return;
      
      this.sshTerminalService.terminal.connectTerminal(terminal, processId);
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
    const changeActiveTerminal = TextDocumentListener.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
      if (event == null) return;

      this.sshTerminalService.decorations.show(event);
      this.sshTerminalService.diagnostics.show(event.document);
    });

    return TextDocumentListener.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      this.sshTerminalService.diagnostics.show(event.document);
    }, { pattern: /\/settings\.json$/ }, [changeActiveTerminal, this.sshTerminalService.diagnostics.collection]);
  }
}