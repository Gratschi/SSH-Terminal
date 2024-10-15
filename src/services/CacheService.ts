import { CacheClear } from "../utils/types";
import ConfigService from "./ConfigService";
import StorageService from "./StorageService";

export default class CacheService {
  constructor(private readonly storage: StorageService, private readonly config: ConfigService, private readonly keyDirectory: string) { }

  async clear(): Promise<CacheClear[]> {
    const settings = this.config.loadSettings();

    const ret = new Array<CacheClear>();
    if (settings.cache.force) {
      this.storage.removeDirectory(this.keyDirectory);
      ret.push({ title: "Removed every ssh key" });
    } else if (settings.cache.clearKeys) {
      // TODO: load them from storage.json > sshkeys (look readme)
      const terminals = await this.config.loadValidSSHKeyTerminals();
      const terminalSSHKeyPaths = [...terminals.global, ...terminals.workspace].map(terminal => terminal.ssh.key as string);

      const removedFiles = await this.storage.clearDirectory(this.keyDirectory, terminalSSHKeyPaths, false);
      ret.push({ title: "Removed unused ssh keys", payload: removedFiles });
    }

    return ret;
  };
};