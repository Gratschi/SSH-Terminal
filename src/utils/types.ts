import { OneOf, RequiredProperty } from "./typesHelper";

const ESSHOptions = {
  SSH_USER_JSON: "SSH_USER_JSON",
  SSH_WORKSPACE_JSON: "SSH_WORKSPACE_JSON",
  SSH_CONFIG: "SSH_CONFIG",
} as const;

type SSHOptions = typeof ESSHOptions[keyof typeof ESSHOptions];

const ETerminalType = {
  SSH_WORKSPACE_JSON: "Workspace",
  SSH_USER_JSON: "Global",
  VSCODE: "VScode",
} as const;

const EStorageType = {
  GLOBAL: "GLOBAL",
  WORKSPACE: "WORKSPACE"
} as const;

type StorageType = typeof EStorageType[keyof typeof EStorageType];

type SSHConfig = {
  host: string,
  user: string,
  password: string,
  port?: number,
  key?: string, // path to ssh key
};

// TODO: check id, type, ...
// TODO: check if correctly implemented
type BaseTerminal = {
  name: string,
  overrideName?: boolean,
  icon?: string,
  color?: string,
  args?: string[] | string,
  env?: Envs,
};

type TerminalPath = BaseTerminal & { path: string };
type TerminalSource = BaseTerminal & { source: string };

type VSCodeBaseTerminal = OneOf<[TerminalPath, TerminalSource]>;

type Terminal = VSCodeBaseTerminal & {
  ssh?: SSHConfig
};
type SSHTerminal = RequiredProperty<Terminal, "ssh"> & RequiredProperty<Terminal, "overrideName">;

type StorageTerminal = {
  global: SSHTerminal[],
  workspace: SSHTerminal[],
};

type VSCodeStorageTerminal = {
  global: Terminal[],
  workspace: Terminal[],
};

// only stores current active valid terminals (os, validation)
type StorageConfig = {
  terminals: StorageTerminal,
};

type SaveType = {
  saved: SSHTerminal[],
  edited: SSHTerminal[],
  removed: SSHTerminal[],
};

type Envs = { [key: string]: string | null | undefined; };

const ESystemPlatform = {
  WINDOWS: "windows",
  MAC: "osx",
  LINUX: "linux"
} as const;

type SystemPlatform = typeof ESystemPlatform[keyof typeof ESystemPlatform];

type SSHKeyReturn = {
  private: {
    path: string,
    key: string,
  }
  public: {
    path: string,
    key: string,
  }
};

const EConfigType = {
  SSH: "ssh",
  TERMINAL: "terminal"
} as const;

type ConfigType = typeof EConfigType[keyof typeof EConfigType];

// "rsa" | "dsa" | "ecdsa" | "ecdsa-sk" | "ed25519" | "ed25519-sk"
const EEncryption = {
  RSA: "RSA",
  DSA: "DSA",
  ECDSA: "ECDSA",
  EdDSA: "EdDSA",
} as const;

type Encryption = typeof EEncryption[keyof typeof EEncryption];

type SSHSettings = {
  configPaths: string[], // ["${env:HOME}\\.ssh\\config"]
  encryption: Encryption,
  encryptionSalt: string,
  autoKey: boolean,
};

type TerminalSettings = {
  icon: string,
  color: string,
  greetingMessage: string,
};

type CacheSettings = {
  force: boolean,
  clearKeys: boolean,
};

type Settings = {
  ssh: SSHSettings,
  terminal: TerminalSettings,
  cache: CacheSettings,
};

export {
  ESSHOptions,
  ESystemPlatform,
  EConfigType,
  ETerminalType,
  EStorageType,
  EEncryption,
};
export type {
  SSHKeyReturn,
  SSHOptions,
  Terminal,
  SSHTerminal,
  StorageTerminal,
  VSCodeStorageTerminal,
  SSHConfig,
  TerminalPath,
  TerminalSource,
  SystemPlatform,
  ConfigType,
  StorageType,
  Envs,
  SSHSettings,
  TerminalSettings,
  Settings,
  StorageConfig,
  SaveType,
  Encryption,
  CacheSettings,
};