import keygen from "ssh-keygen-lite";
import StorageService from "./StorageService";
import path from "path";
import { Encryption, SSHKeyReturn } from "../utils/types";

// Phase 2: parse ssh config files
//    TODO: reads them 
export default class SSHKeyService {
  public readonly saveDirectory: string;

  constructor(private readonly storage: StorageService) {
    this.saveDirectory = this.createSaveDirectory();
  }

  public createSSHKey(encryption: Encryption, password: string): Promise<SSHKeyReturn> {
    return new Promise(async (resolve, reject) => {
      try {
        const filename = `${encryption.toLowerCase()}_${new Date().getTime()}`;
        const location = path.join(this.saveDirectory, filename);
        const type = this.getEncryption(encryption);
      
        keygen({
          location: location,
          type: type,
          read: true,
          force: true,
          destroy: false,
          comment: "# Created by VSCode SSH-Terminal",
          password: password,
          size: "2048",
          format: "PEM",
        }, (err, out) => {
          if (err != null || out == null) {
            return reject("Could not create ssh key");
          }
      
          resolve({
            private: {
              path: location,
              key: out.key,
            },
            public: {
              path: `${location}.pub`,
              key: out.pubKey,
            }
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private getEncryption(type: Encryption): "dsa" | "ecdsa" | "ecdsa-sk" | "ed25519" | "ed25519-sk" | "rsa" {
    switch (type) {
      case "RSA": return "rsa";
      case "DSA": return "dsa";
      case "ECDSA": return "ecdsa";
      case "EdDSA": return "ed25519";
      default: return "rsa";
    }
  }

  private createSaveDirectory(): string {
    const dir = path.join(this.storage.storageDirectory, "keys");

    StorageService.createDirectory(dir);

    return dir;
  }
}