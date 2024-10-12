import vscode from "vscode";

export default class SynchronizeService {
  constructor(private readonly storage: vscode.GlobalState) { }

  public get<T = readonly string[]>(key?: string): T | undefined {
    if (key) return this.storage.get<T>(key);

    return this.storage.keys() as T;
  }

  public async set<T>(key: string, value: T, sync: boolean = false, reset: boolean = false): Promise<void> {
    if (reset) {
      this.sync([]);
      const keys = this.get();
      keys?.forEach(this.remove);
    }

    return this.storage.update(key, value)
      .then(() => {
        if (sync) this.sync([key]);
      });
  }

  public async setMap<T>(map: Map<string, T>, sync: boolean = false, reset: boolean = false): Promise<void> {
    if (reset) {
      this.sync([]);
      const keys = this.get();

      const removePromises: Thenable<void>[] = [];
      keys?.forEach((key) => {
        removePromises.push(this.remove(key));
      });

      await Promise.all(removePromises);
    }

    const promises: Thenable<void>[] = [];
    map.forEach((value, key) => {
      promises.push(this.storage.update(key, value));
    });

    Promise.all(promises)
      .then(() => {
        if (sync) this.sync([...map.keys()]);
      });
  }

  public remove(key: string): Thenable<void> {
    return this.storage.update(key, undefined);
  }

  public sync(keys: readonly string[]): void {
    return this.storage.setKeysForSync(keys);
  }
}