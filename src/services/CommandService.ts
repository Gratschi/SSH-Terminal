import vscode from "vscode";
import SSHTerminalService from "./SSHTerminalService";
import QuickPickOptionsService from "./QuickPickOptionsService";
import MessageHandler from "./MessageHandler";

export default class CommandService {
  public static readonly COMMAND_MODIFY = "ssh-terminal.modify";
  public static readonly COMMAND_CONNECT = "ssh-terminal.connect";
  public static readonly COMMAND_ENCRYPT = "ssh-terminal.encrypt";
  public static readonly COMMAND_SSH_KEY_CREATE = "ssh-terminal.sshkey.create";
  public static readonly COMMAND_CACHE_CLEAR = "ssh-terminal.cache.clear";

  private readonly quickPickOptions: QuickPickOptionsService;

  constructor(private readonly sshTerminal: SSHTerminalService) {
    this.quickPickOptions = new QuickPickOptionsService(sshTerminal.config);
  }

  public registerModifyCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(CommandService.COMMAND_MODIFY, async () => {
      const terminals = this.sshTerminal.config.loadModifyableTerminals();
      const validTerminals = await this.sshTerminal.config.loadValidTerminals();

      const option = await this.quickPickOptions.getModifyableTerminalOption(terminals, validTerminals);
      if (!option) return;

      const path = this.sshTerminal.config.toConfigPath(option.type);
      if (!path) {
        MessageHandler.errorWorkspaceEmpty();
        return;
      }
      const document = await vscode.workspace.openTextDocument(path);
      await vscode.window.showTextDocument(document);
    });
  }

  public registerConnectCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(CommandService.COMMAND_CONNECT, async () => {
      const terminals = await this.sshTerminal.config.loadValidTerminals();

      const option = await this.quickPickOptions.getValidTerminalOption(terminals);
      if (!option) return;

      this.sshTerminal.terminal.createTerminal(option.terminal);
    });
  }

  public registerEncryptCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(CommandService.COMMAND_ENCRYPT, async () => {
      const terminals = await this.sshTerminal.config.loadValidTerminals();

      const option = await this.quickPickOptions.getValidTerminalOption(terminals);
      if (!option) return;

      if (option.terminal.ssh.crypted) {
        const overrideTerminalOption = await this.quickPickOptions.getBooleanOption("Encrypt Password again?");
        if (!overrideTerminalOption) return;
      }

      this.sshTerminal.config.encryptPassword(option.terminal, option.type);
    });
  }

  public registerCacheClearCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(CommandService.COMMAND_CACHE_CLEAR, async () => {
      const res = await this.sshTerminal.cache.clear();
      MessageHandler.infoCacheClear(res);
    });
  }

  public registerSSHKeyCreateCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(CommandService.COMMAND_SSH_KEY_CREATE, async () => {
      const terminals = await this.sshTerminal.config.loadValidTerminals();

      const terminalOption = await this.quickPickOptions.getValidTerminalOption(terminals);
      if (!terminalOption) return;

      if (this.sshTerminal.validator.hasValidSSHKey(terminalOption.terminal)) {
        const overrideTerminalOption = await this.quickPickOptions.getBooleanOption("Override ssh key");
        if (!overrideTerminalOption) return;
      }

      const passwordOption = await this.quickPickOptions.getPasswordTerminalOption();

      const encryptionOption = await this.quickPickOptions.getEncryptionTerminalOption();

      const res = await this.sshTerminal.config.addSSHKey(terminalOption.terminal, terminalOption.type, encryptionOption, passwordOption);
      MessageHandler.infoTerminalSave(res.status, res.keys.public.key);
    });
  }
}