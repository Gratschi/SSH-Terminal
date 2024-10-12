import vscode from "vscode";
import { EEncryption, Encryption, EStorageType, SSHTerminal, StorageTerminal, StorageType, Terminal, VSCodeStorageTerminal } from "../utils/types";
import MessageHandler from "./MessageHandler";
import { PartialNested } from "../utils/typesHelper";
import ConfigService from "./ConfigService";

type TerminalOption = {
  type: StorageType,
  terminal: Terminal,
};

type SSHTerminalOption = {
  type: StorageType,
  terminal: SSHTerminal,
};

type BooleanOption = {
  default: boolean,
  label: {
    valid: string,
    inValid: string,
  }
};

export default class QuickPickOptionsService {
  public constructor(private readonly config: ConfigService) { }

  public async getModifyableTerminalOption(terminals: VSCodeStorageTerminal, validTerminals: StorageTerminal): Promise<TerminalOption | undefined> {
    const options = this.getModifyableTerminalQuickPickOptions(terminals, validTerminals);

    if (!this.hasValidOptions(options)) return;
    const option = await vscode.window.showQuickPick(options, {
      placeHolder: "Select a terminal",
    });

    return option?.payload;
  }

  public async getValidTerminalOption(terminals: StorageTerminal): Promise<SSHTerminalOption | undefined> {
    const options = this.getValidTerminalQuickPickOptions(terminals);

    if (!this.hasValidOptions(options)) return;
    const option = await vscode.window.showQuickPick(options, {
      placeHolder: "Select a terminal",
    });

    return option?.payload;
  }

  public async getBooleanOption(): Promise<boolean> {
    const options = this.getBooleanQuickPickOptions({ default: true });

    const option = await vscode.window.showQuickPick(options, {
      placeHolder: "Override ssh key",
    });

    return option?.payload ?? false;
  }

  public async getPasswordTerminalOption(): Promise<string> {
    const password = await vscode.window.showInputBox({ prompt: "Enter SSH Key Password", password: true });

    return password ?? "";
  }

  public async getEncryptionTerminalOption(): Promise<Encryption> {
    const options = this.getEncryptionQuickPickOptions();

    const option = await vscode.window.showQuickPick(options, {
      placeHolder: "Select an encryption",
    });

    return option?.payload ?? "RSA";
  }

  private getModifyableTerminalQuickPickOptions(terminals: VSCodeStorageTerminal, validTerminals: StorageTerminal): vscode.QuickPickItem<TerminalOption>[] {
    const ret: vscode.QuickPickItem<TerminalOption>[] = [];

    // Seperator "Valid"
    // Seperator "Workspace"
    // Terminal 1
    // Terminal 2
    // Terminal 3
    // Seperator "Global"
    // Terminal 4
    // Terminal 5
    
    // valid terminals
    ret.push({
      label: "Valid Workspace",
      kind: vscode.QuickPickItemKind.Separator
    });

    // valid workspace
    validTerminals.workspace
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.WORKSPACE,
            terminal,
          }
        });
      });

    ret.push({
      label: "Valid Global",
      kind: vscode.QuickPickItemKind.Separator
    });
  
    // valid global
    validTerminals.global
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.GLOBAL,
            terminal,
          }
        });
      });


    // Invalid terminals
    ret.push({
      label: "Workspace",
      kind: vscode.QuickPickItemKind.Separator
    });

    // workspace
    terminals.workspace
      .filter(terminal => !validTerminals.workspace.some(valid => valid.name === terminal.name))
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.WORKSPACE,
            terminal,
          }
        });
      });

    ret.push({
      label: "Global",
      kind: vscode.QuickPickItemKind.Separator
    });

    // global
    terminals.global
      .filter(terminal => !validTerminals.global.some(valid => valid.name === terminal.name))
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.GLOBAL,
            terminal,
          }
        });
      });
    
    return ret;
  }

  private getValidTerminalQuickPickOptions(terminals: StorageTerminal): vscode.QuickPickItem<SSHTerminalOption>[] {
    const ret: vscode.QuickPickItem<SSHTerminalOption>[] = [];

    // Seperator "Workspace"
    // Terminal 1
    // Terminal 2
    // Terminal 3
    // Seperator "Global"
    // Terminal 4
    // Terminal 5
    
    ret.push({
      label: "Workspace",
      kind: vscode.QuickPickItemKind.Separator
    });

    // workspace
    terminals.workspace
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.WORKSPACE,
            terminal,
          }
        });
      });

    // global
    ret.push({
      label: "Global",
      kind: vscode.QuickPickItemKind.Separator
    });

    terminals.global
      .forEach(terminal => {
        ret.push({
          label: terminal.name,
          payload: {
            type: EStorageType.GLOBAL,
            terminal,
          }
        });
      });

    return ret;
  }

  private getBooleanQuickPickOptions(options?: PartialNested<BooleanOption>): vscode.QuickPickItem<boolean>[] {
    const ret: vscode.QuickPickItem<boolean>[] = [];

    const defaultOptions = {
      default: options?.default ?? false,
      label: {
        valid: options?.label?.valid ?? "Yes",
        inValid: options?.label?.inValid ?? "No",
      }
    } satisfies BooleanOption;


    // default
    ret.push({
      label: defaultOptions.default ? defaultOptions.label.valid : defaultOptions.label.inValid,
      payload: defaultOptions.default,
      kind: vscode.QuickPickItemKind.Default
    });

    ret.push({
      label: !defaultOptions.default ? defaultOptions.label.valid : defaultOptions.label.inValid,
      payload: !defaultOptions.default
    });

    return ret;
  }

  private getEncryptionQuickPickOptions(): vscode.QuickPickItem<Encryption>[] {
    const ret: vscode.QuickPickItem<Encryption>[] = [];

    const defaultEncryption = this.config.loadSettings().ssh.encryption;
    const availableEncryptions = Object.values(EEncryption).filter(enc => enc !== defaultEncryption);

    // default
    ret.push({
      label: "Default",
      kind: vscode.QuickPickItemKind.Separator
    });

    ret.push({
      label: defaultEncryption,
      payload: defaultEncryption,
      kind: vscode.QuickPickItemKind.Default
    });

    availableEncryptions.forEach(encryption => {
      ret.push({
        label: encryption,
        payload: encryption
      });
    });
    
    return ret;
  }

  private hasValidOptions(options: vscode.QuickPickItem<TerminalOption | SSHTerminalOption>[]): boolean {
    if (options.length === 0) {
      MessageHandler.warningNoTerminalsDefined();
      return false;
    }

    return true;
  }
}