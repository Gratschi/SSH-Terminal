import vscode from "vscode";
import SSHTerminalService from "./services/SSHTerminalService";
import CommandService from "./services/CommandService";
import ListenerService from "./services/ListenerService";

let SSHTerminal: SSHTerminalService;

export function activate(context: vscode.ExtensionContext): void {
  SSHTerminal = new SSHTerminalService(context);

  registerCommands(context);
}

export function deactivate(): void {
  // TODO: should only trigger if (deactivated, removed)
  // TODO: mb there is some file you can check for (vscode.env.appRoot)
  // TODO: or mb need to create another plugin which checks if a plugin is active or not
  // AppData\Local\Programs\Microsoft VS Code\resources\app
  // SSHTerminal.cache.clear();
}

function registerCommands(context: vscode.ExtensionContext): void {
  const command = new CommandService(SSHTerminal);
  const listener = new ListenerService(SSHTerminal);

  // commands
  const commandModify = command.registerModifyCommand();
  const commandConnect = command.registerConnectCommand();
  const commandSSHKeyCreate = command.registerSSHKeyCreateCommand();
  const commandClearCache = command.registerCacheClearCommand();
  
  // listeners
  const listenerTerminalChange = listener.onDidChangeActiveTerminal();
  const listenerConfigFileSave = listener.onDidSaveConfigFile();
  const listenerSyntaxChecker = listener.syntaxCheckConfigFile();

  context.subscriptions.push(
    commandModify,
    commandConnect,
    commandSSHKeyCreate,
    commandClearCache,
    listenerTerminalChange,
    listenerConfigFileSave,
    listenerSyntaxChecker
  );
}