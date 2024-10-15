import { Envs, SSHTerminal } from "../utils/types";
import { isStringArray } from "../utils/default";
import StorageService from "./StorageService";

export default class TerminalValidator {
  public validateTerminal(terminal: unknown, name?: string): SSHTerminal | undefined {
    if (!this.isValidTerminal(terminal, name)) return;
    
    return name ? {
      ...terminal,
      name: name,
    } as SSHTerminal : terminal as SSHTerminal;
  }

  /*
   * -1 deleted
   * 0  same (no changes)
   * 2  edited
   * 1  saved
   */
  public isSameTerminal(prevTerminal?: SSHTerminal, terminal?: SSHTerminal): -1 | 1 | 2 | 0 {
    // checks created or deleted
    if (prevTerminal == null && terminal == null) return 0;
    if (prevTerminal == null) return 1;
    if (terminal == null) return -1;

    // check for changes
    // don't need to check (name, overrideName)
    if (prevTerminal.icon !== terminal.icon
      || prevTerminal.color !== terminal.color
      || !this.isSameArgs(prevTerminal.args, terminal.args) 
      || !this.isSameEnv(prevTerminal.env, terminal.env)
      || prevTerminal.path !== terminal.path
      || prevTerminal.source !== terminal.source
      || prevTerminal.ssh.host !== terminal.ssh.host
      || prevTerminal.ssh.user !== terminal.ssh.user
      || prevTerminal.ssh.port !== terminal.ssh.port
      || prevTerminal.ssh.password !== terminal.ssh.password
      || prevTerminal.ssh.crypted !== terminal.ssh.crypted
      || prevTerminal.ssh.key !== terminal.ssh.key
    ) return 2;

    return 0;
  }

  public hasValidSSHKey(terminal: SSHTerminal): boolean {
    if (terminal.ssh.key == null) return false;

    return StorageService.isFile(terminal.ssh.key);
  }

  public toSSHTerminalMap(terminals: SSHTerminal[]): Map<string, SSHTerminal> {
    return new Map(terminals.map(terminal => [terminal.name, terminal]));
  }

  public hasTerminal(arr: SSHTerminal[], terminal: SSHTerminal): boolean {
    return arr.some(prevTerminal => prevTerminal.name === terminal.name);
  }

  public concatKey(...keys: (string | undefined)[]): string {
    return keys.filter(Boolean).join(".");
  }

  private isValidTerminal(terminal: unknown, name?: string): terminal is SSHTerminal {
    if (typeof terminal !== "object" || terminal === null) return false;

    // check required types
    if (!name && "name" in terminal && typeof terminal.name !== "string") return false;
    if (!("overrideName" in terminal) || terminal.overrideName !== true) return false;

    // check required one of types
    if (!("path" in terminal) && !("source" in terminal)) return false;
    if ("path" in terminal && typeof terminal.path !== "string") return false;
    if ("source" in terminal && typeof terminal.source !== "string") return false;

    // check non-required types
    if ("color" in terminal && typeof terminal.color !== "string") return false;
    if ("args" in terminal && typeof terminal.args !== "string" && !isStringArray(terminal.args)) return false;

    if (!("ssh" in terminal) || typeof terminal.ssh !== "object" || terminal.ssh === null) return false;

    const ssh = terminal.ssh;
  
    // check required types
    if (!("host" in ssh) || typeof ssh.host !== "string") return false;
    if (!("user" in ssh) || typeof ssh.user !== "string") return false;

    // check non-required types
    if ("port" in ssh && typeof ssh.port !== "number") return false;
    if ("password" in ssh && typeof ssh.password !== "string") return false;
    if ("crypted" in ssh && typeof ssh.crypted !== "boolean") return false;
    if (!("password" in ssh) && "key" in ssh && typeof ssh.key !== "string" && !StorageService.isFile(ssh.key as string)) return false;

    return true;
  }

  private isSameArgs(prev: string | string[] | undefined, next: string | string[] | undefined): boolean {
    return (typeof prev === "object" && typeof next === "object") ? this.isSameStringArray(prev, next) : prev === next;
  }

  private isSameEnv(prev: Envs | undefined, next: Envs | undefined): boolean {
    return (typeof prev === "object" && typeof next === "object") ? this.isSameStringObject(prev, next) : prev === next;
  }

  private isSameStringArray(prev: string[], next: string[]): boolean {
    if (prev.length !== next.length) {
      return false;
    }

    return prev.every(value => next.some(nextValue => nextValue === value));
  }

  private isSameStringObject(prev: object, next: object): boolean {
    const prevEntries = Object.entries(prev);
    const nextEntries = Object.entries(next);

    if (prevEntries.length !== nextEntries.length) {
      return false;
    }

    return  prevEntries.every(([key, value]) => nextEntries.some(([nextKey, nextValue]) => key === nextKey && value === nextValue));
  }
}