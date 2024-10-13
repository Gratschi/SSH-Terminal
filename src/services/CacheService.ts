import ConfigService from "./ConfigService";
import StorageService from "./StorageService";

export default class CacheService {
  constructor(private readonly storage: StorageService, private readonly config: ConfigService, private readonly keyDirectory: string) { }

  async clear(force?: boolean): Promise<void> {
    const settings = this.config.loadSettings();
    // TODO: add settings (cache.force undefined)

    if (force || (settings.cache.force && force == null)) {
      this.storage.removeDirectory(this.keyDirectory);
    } else if (settings.cache.clearKeys) {
      const terminals = await this.config.loadValidSSHKeyTerminals();
      // TODO: check isFileInDirectory (nowork)
      const terminalSSHKeyPaths = [...terminals.global, ...terminals.workspace]
        .map(terminal => terminal.ssh.key as string)
        .filter(file => StorageService.isFileInDirectory(this.keyDirectory, file));

      this.storage.clearDirectory(this.keyDirectory, terminalSSHKeyPaths, false);
    }

    return;
  };
};