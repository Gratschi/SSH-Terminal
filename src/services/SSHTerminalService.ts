import vscode from "vscode";

import TerminalService from "./TerminalService";
import StorageService from "./StorageService";
import CacheService from "./CacheService";
import ConfigService from "./ConfigService";
import TerminalValidator from "./TerminalValidator";

export default class SSHTerminalService {
  public static readonly NAME = "ssh-terminal";

  public storage: StorageService;
  public terminal: TerminalService;
  public config: ConfigService;
  public validator: TerminalValidator;
  public cache: CacheService;

  public constructor(context: vscode.ExtensionContext) {
    this.storage = new StorageService(context);
    this.config = new ConfigService(context, this.storage, StorageService.PLATFORM);
    this.terminal = new TerminalService(this.config);
    this.validator = new TerminalValidator();
    this.cache = new CacheService(this.storage, this.config, this.config.sshkey.saveDirectory);
  }
};