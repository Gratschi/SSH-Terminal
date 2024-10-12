import vscode from "vscode";
import { StorageType, SSHTerminal, StorageTerminal, SystemPlatform } from "../utils/types";
import TerminalValidator from "./TerminalValidator";
import ConfigService from "./ConfigService";
import StorageService from "./StorageService";

export default class VSCodeConfigService {
  constructor(private readonly platform: SystemPlatform, private readonly storage: StorageService, private readonly validator: TerminalValidator,) { }

  public async parseVscodeTerminals(content: string, type: StorageType): Promise<StorageTerminal> {
    const prevTerminals = this.loadVscodeTerminals(true);
    const json = await this.storage.parseJson<any>(content);

    if (json == null) return prevTerminals;

    const terminals = json[`terminal.integrated.profiles.${this.platform}`] ?? undefined;
    if (terminals == null) return prevTerminals;

    const newTerminals = new Map<string, SSHTerminal>();
    this.setMapValues(newTerminals, terminals, true);

    switch (type) {
      case "GLOBAL":
        prevTerminals.global = [...newTerminals.values()];
        break;
      case "WORKSPACE":
        prevTerminals.workspace = [...newTerminals.values()];
        break;
    }

    return prevTerminals;
  }

  public async updateVscodeTerminal(terminal: SSHTerminal, type: StorageType): Promise<void> {
    const key = this.validator.concatKey(ConfigService.INTEGRATED_TERMINAL_PROFILES, this.platform);
    const config = vscode.workspace.getConfiguration();
    const inspection = config.inspect<ProxyHandler<object>>(key);

    const prevTerminals = (type === "GLOBAL") ? (inspection?.globalValue ?? {}) : (inspection?.workspaceValue ?? {});
    const target = (type === "GLOBAL") ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
    const newTerminals = this.updateTerminals(prevTerminals, terminal);

    return config.update(key, newTerminals, target);
  }

  public loadVscodeTerminals<T = StorageTerminal>(validate: boolean = false): T {
    const key = this.validator.concatKey(ConfigService.INTEGRATED_TERMINAL_PROFILES, this.platform);
    const config = vscode.workspace.getConfiguration();
    const configs = config.inspect(key);

    const globalValues = new Map<string, SSHTerminal>();
    if (configs?.globalValue && typeof configs?.globalValue === "object") {
      this.setMapValues(globalValues, configs.globalValue, validate);
    }

    const workspaceValues = new Map<string, SSHTerminal>();
    if (configs?.workspaceValue && typeof configs?.workspaceValue === "object") {
      this.setMapValues(workspaceValues, configs.workspaceValue, validate, ([name]) => !globalValues.has(name));
    }

    return {
      global: [...globalValues.values()],
      workspace: [...workspaceValues.values()],
    } as T;
  }

  private updateTerminals(prevTerminals: ProxyHandler<object>, terminal: SSHTerminal): unknown {
    const terminalName = terminal.name;
    const terminals = Object.keys(prevTerminals);
    if (!terminals.includes(terminalName)) return prevTerminals;
    
    // @ts-expect-error ts(2790): The operand of a 'delete' operator must be optional
    delete terminal.name;

    // @ts-expect-error ts(7053)
    prevTerminals[terminalName] = terminal;

    return prevTerminals;
  }

  private setMapValues(map: Map<string, SSHTerminal>, terminals: Object, validate: boolean, filter?: (value: [string, unknown]) => boolean): void {
    const arr = (filter && validate) ? Object.entries(terminals).filter(filter) : Object.entries(terminals);
    
    arr.forEach(([name, terminal]) => {
      if (!validate) {
        map.set(name, {
          ...terminal,
          name,
        });
        return;
      }

      const validTermial = this.validator.validateTerminal(terminal, name);
      if (!validTermial) return;
      
      map.set(name, {
        ...validTermial,
        name,
      });
    });
  }
}