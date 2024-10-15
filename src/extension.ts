import vscode from "vscode";
import SSHTerminalService from "./services/SSHTerminalService";
import CommandService from "./services/CommandService";
import ListenerService from "./services/ListenerService";
import VariableWatcher from "./services/VariableWatcher";

let SSHTerminal: SSHTerminalService;
const variableWatcher = VariableWatcher.getInstance({ activeTerminal: undefined });

export function activate(context: vscode.ExtensionContext): void {
  SSHTerminal = new SSHTerminalService(context);

  registerCommands(context);

  // change values (check activationEvents in package.json (will only trigger on start and never again))
  // needs to be set after registering, otherwise it will not trigger as a change
  variableWatcher.activeTerminal = vscode.window.activeTextEditor;
}

export function deactivate(): void {
  /**
   * Will be called if
   *  - When VSCode is Closing
   *  - When the Extension is Disabled
   *  - When the Extension is Uninstalled
   *  - When VSCode Switches to a Different Workspace
   *  - When the Extension is Idle (under Some Conditions)
   */

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
  const commandEncrypt = command.registerEncryptCommand();
  const commandSSHKeyCreate = command.registerSSHKeyCreateCommand();
  const commandClearCache = command.registerCacheClearCommand();
  
  // listeners
  const listenerTerminalChange = listener.onDidChangeActiveTerminal();
  const listenerConfigFileSave = listener.onDidSaveConfigFile();
  const listenerSyntaxChecker = listener.syntaxCheckConfigFile();

  context.subscriptions.push(
    commandModify,
    commandConnect,
    commandEncrypt,
    commandSSHKeyCreate,
    commandClearCache,
    listenerTerminalChange,
    listenerConfigFileSave,
    listenerSyntaxChecker
  );
}