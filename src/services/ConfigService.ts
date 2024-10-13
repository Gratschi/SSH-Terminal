import vscode from "vscode";
import path from "path";

import { ConfigType, Settings, SystemPlatform, SSHTerminal, StorageConfig, SaveType, StorageTerminal, StorageType, EStorageType, VSCodeStorageTerminal, Encryption, SSHKeyCreate } from "../utils/types";

import StorageService from "./StorageService";
import TerminalValidator from "./TerminalValidator";
import SynchronizeService from "./SynchronizeService";
import SSHTerminalException from "../exception/SSHTerminalException";
import SSHTerminalService from "./SSHTerminalService";
import VSCodeConfigService from "./VSCodeConfigService";
import SSHKeyService from "./SSHKeyService";
import CONFIG from "../utils/config";

export default class ConfigService {
  public static readonly INTEGRATED_TERMINAL_PROFILES = "terminal.integrated.profiles";
  
  public readonly globalConfig: string; // global settings.json
  public readonly workspaceConfig: string; // workspace settings.json
  public readonly sshkey: SSHKeyService;
  
  private readonly settings: Settings;
  private readonly validator: TerminalValidator;
  private readonly vscodeTerminal: VSCodeConfigService;
  private readonly storageConfig: string;
  private readonly synchronize: SynchronizeService;

  public constructor(context: vscode.ExtensionContext, private readonly storage: StorageService, private readonly platform: SystemPlatform) {
    this.validator = new TerminalValidator();
    this.sshkey = new SSHKeyService(this.storage);
    
    this.settings = this.loadSettings();
    this.globalConfig = this.createGlobalConfig();
    this.workspaceConfig = this.createWorkspaceConfig();

    this.vscodeTerminal = new VSCodeConfigService(this.platform, this.storage, this.validator);

    this.storageConfig = this.createStorageConfig();
    this.synchronize = new SynchronizeService(context.globalState);

    console.debug("ConfigService",
      [
        this.settings,
        this.storageConfig,
        this.globalConfig,
        this.workspaceConfig,
      ]);
  }

  public loadSettings(): Settings {
    const config = vscode.workspace.getConfiguration();
    return config.get<Settings>(SSHTerminalService.NAME) as Settings;
  }

  public toConfigPath(type: StorageType): string {
    return type === "WORKSPACE" ? this.workspaceConfig : this.globalConfig;
  }

  public loadModifyableTerminals(): VSCodeStorageTerminal {
    return this.vscodeTerminal.loadVscodeTerminals<VSCodeStorageTerminal>();
  }

  public async loadValidTerminals(): Promise<StorageTerminal> {
    return this.loadStorageTerminals();
  }

  public async loadValidSSHKeyTerminals(): Promise<StorageTerminal> {
    return this.loadStorageTerminals(true);
  }

  public async loadTerminal(name: string): Promise<SSHTerminal | undefined> {
    const terminals = await this.loadValidTerminals();

    return [...terminals.global, ...terminals.workspace]
      .find(terminal => terminal.name === name);
  }

  public async saveConfig(content: string, path: string): Promise<SaveType | undefined> {
    const storageType = this.getStorageType(path);
    if (storageType == null) return;

    const newTerminals = await this.vscodeTerminal.parseVscodeTerminals(content, storageType);
    return this.updateAllStorageTerminals(newTerminals);
  }

  public async addSSHKey(terminal: SSHTerminal, type: StorageType, encryption: Encryption, password: string): Promise<SSHKeyCreate> {
    const keys = await this.sshkey.createSSHKey(encryption, password);

    terminal.ssh.key = keys.private.path;
    this.vscodeTerminal.updateVscodeTerminal({ ...terminal }, type);
    const status = await this.updateStorageTerminal({ ...terminal }, type);

    return {
      keys,
      status,
    };
  }

  public async openSettings(type?: ConfigType, key?: string): Promise<void> {
    const tmpId = this.validator.concatKey(SSHTerminalService.NAME, type, key);

    return vscode.commands.executeCommand("workbench.action.openSettings", tmpId);
  }

  private getStorageType(path: string): StorageType | undefined {
    return StorageService.comparePath(path, this.globalConfig) ? EStorageType.GLOBAL : 
      StorageService.comparePath(path, this.workspaceConfig) ? EStorageType.WORKSPACE : 
        undefined;
  }

  private async loadStorageConfig(path?: string): Promise<Partial<StorageConfig> | undefined> {
    return this.storage.readJson<Partial<StorageConfig>>(!path ? this.storageConfig : path, false);
  }

  private async loadStorageTerminals(validSSHKey: boolean = false): Promise<StorageTerminal> {
    const json = await this.loadStorageConfig();
    if (!json || json.terminals == null) {
      return {
        global: new Array<SSHTerminal>(),
        workspace: new Array<SSHTerminal>(),
      };
    }

    if (validSSHKey) {
      json.terminals.global = json.terminals.global.filter(this.validator.hasValidSSHKey);
      json.terminals.workspace = json.terminals.workspace.filter(this.validator.hasValidSSHKey);
    }

    return json.terminals;
  }

  private async updateStorageTerminal(terminal: SSHTerminal, type: StorageType): Promise<SaveType> {
    const prevStorage = await this.loadStorageConfig();

    const ret = {
      saved: new Array<SSHTerminal>(),
      edited: new Array<SSHTerminal>(),
      removed: new Array<SSHTerminal>(),
    } satisfies SaveType;
    if (prevStorage == null) {
      return ret;
    } else if (prevStorage.terminals == null) {
      const newTerminals = {
        global: new Array<SSHTerminal>(),
        workspace: new Array<SSHTerminal>(),
      } satisfies StorageTerminal;

      if (type === "GLOBAL") newTerminals.global = [terminal];
      else newTerminals.workspace = [terminal];

      this.updateStorageFile(prevStorage, newTerminals);
      ret.saved.push(terminal);

      return ret;
    }

    // TODO: refactor this
    const prevStorageTypeTerminals = (type === "GLOBAL") ? prevStorage.terminals.global : prevStorage.terminals.workspace;
    this.addTerminals(ret, prevStorageTypeTerminals, [terminal]);
    
    if (!this.validator.hasTerminal(prevStorageTypeTerminals, terminal)) prevStorageTypeTerminals.push(terminal);

    if (type === "GLOBAL") prevStorage.terminals.global = prevStorageTypeTerminals;
    else prevStorage.terminals.workspace = prevStorageTypeTerminals;

    this.updateStorageFile(prevStorage, prevStorage.terminals);
    
    return ret;
  }

  private async updateAllStorageTerminals(newTerminals: StorageTerminal, path?: string): Promise<SaveType> {
    const prevStorage = await this.loadStorageConfig(path);

    const ret = {
      saved: new Array<SSHTerminal>(),
      edited: new Array<SSHTerminal>(),
      removed: new Array<SSHTerminal>(),
    } satisfies SaveType;
    if (prevStorage == null) {
      return ret;
    } else if (prevStorage.terminals == null) {
      this.updateStorageFile(prevStorage, newTerminals);
      newTerminals.global.forEach(terminal => ret.saved.push(terminal));
      newTerminals.workspace.forEach(terminal => ret.saved.push(terminal));

      return ret;
    }

    this.addTerminals(ret, prevStorage.terminals.global, newTerminals.global);
    this.addTerminals(ret, prevStorage.terminals.workspace, newTerminals.workspace);

    this.updateStorageFile(prevStorage, newTerminals);
    
    return ret;
  }

  private async updateStorageFile(config: Partial<StorageConfig>, newTerminals: StorageTerminal): Promise<void> {
    config.terminals = newTerminals;

    const infoMessage = "// Do not modify! This is autogenerated!";
    const configStringify = CONFIG.Debug ? JSON.stringify(config, null, 2) : JSON.stringify(config);

    const content = `${infoMessage}\n${configStringify}`;
    return this.storage.updateFile(this.storageConfig, content);
  }

  private addTerminals(ref: SaveType, storage: SSHTerminal[], newTerminals: SSHTerminal[]): void {
    const storageMap = this.validator.toSSHTerminalMap(storage);
    const newTerminalsMap = this.validator.toSSHTerminalMap(newTerminals);

    [...storage, ...newTerminals].forEach(terminal => {
      const prevTerminal = storageMap.get(terminal.name);
      const newTerminal = newTerminalsMap.get(terminal.name);
      const changes = this.validator.isSameTerminal(prevTerminal, newTerminal);

      switch (changes) {
        case -1: {
          if (!this.validator.hasTerminal(ref.removed, terminal)) ref.removed.push(terminal);
          return;
        }
        case 1: {
          if (!this.validator.hasTerminal(ref.saved, terminal)) ref.saved.push(terminal);
          return;
        }
        case 2: {
          if (!this.validator.hasTerminal(ref.edited, terminal)) ref.edited.push(terminal);
          return;
        }
      }
    });
  }

  private createStorageConfig(): string {
    const storageConfigPath = path.join(this.storage.storageDirectory, "storage.json");

    const newTerminals = this.vscodeTerminal.loadVscodeTerminals(true);
    this.updateAllStorageTerminals(newTerminals, storageConfigPath);

    return storageConfigPath; 
  }

  private createGlobalConfig(): string {
    const globalConfigPath = path.join(this.storage.globalDirectory, "settings.json");
    
    this.storage.createFile(globalConfigPath).catch(() => {});

    return globalConfigPath;
  }

  private createWorkspaceConfig(): string {
    if (!this.storage.workspaceDirectory) throw new SSHTerminalException("Workspace directory undefined!");

    const workspaceConfigPath = path.join(this.storage.workspaceDirectory, ".vscode/settings.json");
    this.storage.createFile(workspaceConfigPath).catch(() => {});

    return workspaceConfigPath;
  }
}