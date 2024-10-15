import vscode from "vscode";
import path from "path";
import fs from "fs";
import os from "os";
import json from "comment-json";
import { fileURLToPath, Url } from "url";
import { ESystemPlatform, SystemPlatform } from "../utils/types";
import SSHTerminalException from "../exception/SSHTerminalException";
import MessageHandler from "./MessageHandler";

export default class StorageService {
  public static readonly PLATFORM = StorageService.getPlatform();
  public static readonly HOME_DIR = StorageService.getHomeDir();

  public readonly rootDirectory: string;
  public readonly storageDirectory: string;
  public readonly globalDirectory: string;
  public readonly workspaceDirectory: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.rootDirectory = this.getRootDirectory();
    this.storageDirectory = this.getStorageDirectory(context);
    this.workspaceDirectory = this.getWorkspaceDirectory();
    this.globalDirectory = this.getGlobalDirectory();

    console.debug("StorageService",
      [
        StorageService.PLATFORM,
        StorageService.HOME_DIR,
        this.rootDirectory,
        this.storageDirectory,
        this.globalDirectory,
        this.workspaceDirectory,
      ]);
  }

  public static isFile(file: string, convert: boolean = false): boolean {
    const filePath = convert ? this.convertPath(file) : file;

    return !!(fs.statSync(filePath, { throwIfNoEntry: false })?.isFile());
  }
  
  public static isDirectory(dir: string): boolean {
    return !!(fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory());
  }

  public static comparePath(compareFrom: string, compareTo: string): boolean {
    return path.relative(compareFrom, compareTo).length === 0;
  }

  public static isFileInDirectory(compareFrom: string, compareTo: string): boolean {
    const fromDir = path.resolve(compareFrom);
    const toFile = path.resolve(compareTo);

    if (!this.isDirectory(fromDir)) return false;
    if (!this.isFile(toFile)) return false;

    const relativePath = path.relative(fromDir, toFile);
    
    return !relativePath.startsWith("..");
  }
  
  public static convertPath(path: string): string {
    // TODO: check for better solution
    // TODO: nice windows C drive assertion
    // TODO: upper / lowercase (check for ${})
    return path.replace("${env:HOME}", this.HOME_DIR).replace("${env:windir}", "C:\\Windows");
  }
  
  public static isFileUrl(file: string | Url): file is Url {  
    if (typeof file !== "string" && !(file instanceof URL)) return false;
  
    try {
      const url = new URL(file);

      return url.protocol === "file:";
    } catch (err) {
      return false;
    }
  }
  
  public static fileUrlToPath(file: string | URL): string {  
    return fileURLToPath(file);
  }
  
  public static async createDirectory(dir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (StorageService.isDirectory(dir)) return resolve(dir);
  
      fs.mkdir(dir, { recursive: true }, (err, path) => {
        if (err) {
          return reject(`Cannot create directory: '${dir}'`);
        }
  
        // path is defined if there is no error
        resolve(path as string);
      });
    });
  }

  private static getHomeDir(): string {
    return os.homedir();
  }
  
  private static getPlatform(): SystemPlatform {
    switch (process.platform) {
      case "win32":
        return ESystemPlatform.WINDOWS;
      case "darwin":
        return ESystemPlatform.MAC;
      default:
        return ESystemPlatform.LINUX;
    }
  }
  
  public async removeDirectory(dir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!StorageService.isDirectory(dir)) return resolve();
  
      fs.rm(dir, { recursive: true, force: true }, (err) => {
        if (err) {
          return reject(`Cannot remove directory: '${dir}'`);
        }
  
        resolve();
      });
    });
  }
  
  /**
   * If the directory does not exists will resolve immediatly
   * @param dir directory to delete files from
   * @param files list of file paths
   * @param blacklist includes every file which is in the files list to remove from (default: true (excludes if false))
   * @returns
   */
  public async clearDirectory(dir: string, files: string[], blacklist: boolean = true): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!StorageService.isDirectory(dir)) return resolve([]);
      const newFiles = files.filter(file => StorageService.isFileInDirectory(dir, file));

      if (blacklist) {
        const callbacks = newFiles.map(this.removeFile);
        Promise.all(callbacks)
          .then(() => resolve(newFiles))
          .catch(reject);
      } else {
        this.readDirectory(dir)
          .then(storedFiles => {
            const blacklistFiles = storedFiles
              .map(file => path.join(dir, file))
              .filter(file => !newFiles.some(newFile => StorageService.comparePath(newFile, file)));

            const callbacks = blacklistFiles.map(this.removeFile);
            Promise.all(callbacks)
              .then(() => resolve(blacklistFiles))
              .catch(reject);
          })
          .catch(reject);
      }
    });
  }
  
  public async removeFile(file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!StorageService.isFile(file)) return resolve();
  
      fs.rm(file, (err) => {
        if (err) {
          return reject(`Cannot remove file: '${file}'`);
        }
  
        resolve();
      });
    });
  }

  public parseJson<T = object>(content: string, validate: boolean = true, comments: boolean = false): Promise<T> {
    return new Promise((resolve, reject) => {
      let ret = {} as T;
      try {
        ret = json.parse(content, null, !comments) as T;
      } catch (e) {
        if (validate) {
          return reject(e);
        }
      }

      resolve(ret);
    });
  }

  public parseJsonSync<T>(content: string, comments: boolean = false): T | undefined {
    try {
      return json.parse(content, null, !comments) as T;
    } catch { }
  }

  public async readJson<T>(path: string, validate: boolean = true, comments: boolean = false): Promise<T> {
    return new Promise((resolve, reject) => {
      this.readFile(path)
        .then(data => {
          this.parseJson(data, validate, comments)
            .then(json => resolve(json as T))
            .catch(reject);
        })
        .catch(reject);
    });
  }

  public readJsonSync<T>(path: string, comments: boolean = false): T | undefined {
    try {
      const content = this.readFileSync(path);
      return content ? this.parseJsonSync(content, comments) : undefined;
    } catch { }
  }

  public async readFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject();
          return;
        }

        resolve(data.toString());
      });
    });
  }

  public readFileSync(path: string): string | undefined {
    try {
      return fs.readFileSync(path, { encoding: "utf-8" });
    } catch { }
  }
  
  public async createFile(path: string, override: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!override && StorageService.isFile(path)) return reject("File already exists");

      this.updateFile(path, "")
        .then(() => resolve())
        .catch(reject);
    });
  }

  public createFileSync(path: string, override: boolean = false): boolean {
    if (!override && StorageService.isFile(path)) return false;
    
    if (!this.updateFileSync(path, "")) return false;
    return true;
  }

  public async updateFile(path: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, { encoding: "utf-8" }, (err) => {
        if (err) return reject(err);

        resolve();
      });
    });
  }

  public updateFileSync(path: string, content: string): boolean {
    try {
      fs.writeFileSync(path, content, { encoding: "utf-8" });
      return true;
    } catch { }
    
    return false;
  }

  public async readDirectory(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, "utf-8", (err, files) => {
        if (err) return reject(err);

        resolve(files);
      });
    });
  }

  private getRootDirectory(): string {
    const rootPath = this.getRootPath();
    const ret = this.createDirectorySync(rootPath);

    if (!ret) throw new SSHTerminalException("Could not create storage directory!");
    return ret;
  }

  private getRootPath(): string {
    switch (StorageService.PLATFORM) {
      case "windows":
        return path.join(os.homedir(), "AppData/Roaming/Code/User");
      case "osx":
        return path.join(os.homedir(), "Library/Application Support/Code/User");
      case "linux":
        return path.join(os.homedir(), ".config/Code/User");
    }
  }

  private getStorageDirectory(context: vscode.ExtensionContext): string {
    const ret = this.createDirectorySync(context.globalStorageUri.fsPath);

    if (!ret) throw new SSHTerminalException("Could not create storage directory");
    return ret;
  }
  
  private getWorkspaceDirectory(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      MessageHandler.errorWorkspaceEmpty();
      return;
    }

    const dir = workspaceFolders[0].uri.fsPath;
    if (!StorageService.isDirectory(dir)) return;

    return dir;
  }

  private getGlobalDirectory(): string {
    if (!this.workspaceDirectory) return this.rootDirectory;

    const globalStorageJsonPath = path.join(this.storageDirectory, "../storage.json");
    // TODO: cannot access profile api (need id for configPath to open and change terminals)
    // https://github.com/microsoft/vscode/issues/211890

    if (!StorageService.isFile(globalStorageJsonPath)) return this.rootDirectory;

    const globalStorage = this.readJsonSync(globalStorageJsonPath);
    const workspaceProfiles = this.getWorkspaceProfiles(globalStorage);

    const profile = workspaceProfiles.find(profile => StorageService.comparePath(profile.path, this.workspaceDirectory as string));
    if (!profile) return this.rootDirectory;

    const profileDirectory = (profile.profile === "__default__profile__") ? this.rootDirectory : path.join(this.rootDirectory, "profiles", profile.profile);
    if (!StorageService.isDirectory(profileDirectory)) return this.rootDirectory;

    return profileDirectory;
  }

  private getWorkspaceProfiles(globalStorage: unknown): Array<{ path: string, profile: string }> {
    if (globalStorage == null || typeof globalStorage !== "object"
      || !("profileAssociations" in globalStorage) || globalStorage.profileAssociations == null || typeof globalStorage.profileAssociations !== "object" 
      || !("workspaces" in globalStorage.profileAssociations) || globalStorage.profileAssociations.workspaces == null || typeof globalStorage.profileAssociations.workspaces !== "object") return [];

    return Object.entries(globalStorage.profileAssociations.workspaces)
      .filter(([key]) => StorageService.isFileUrl(key))
      .map(([key, value]) => {
        return {
          path: StorageService.fileUrlToPath(key),
          profile: value,
        };
      });
  }

  private createDirectorySync(dir: string): string | undefined {
    if (StorageService.isDirectory(dir)) return dir;

    const ret = fs.mkdirSync(dir, { recursive: true });

    if (ret !== dir) return;

    return dir;
  }
};