import crypto from "crypto";

export default class CryptoService {
  private readonly HASH_ALGORITM = "aes-256-cbc";
  
  public encrypt(password: string): string | undefined {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(this.HASH_ALGORITM, key, iv);

    const enc1 = cipher.update(password, "utf8");
    const enc2 = cipher.final();
    return Buffer.concat([enc1, enc2, key, iv]).toString("base64");
  }

  public decrypt(hash: string): string | undefined {
    const buffer = Buffer.from(hash, "base64");

    const iv = buffer.subarray(buffer.length - 16);
    const key = buffer.subarray(buffer.length - 48, buffer.length - 16);
    const enc = buffer.subarray(0, buffer.length - 48);
    
    let decrypted;
    try {
      const decipher = crypto.createDecipheriv(this.HASH_ALGORITM, key, iv);
  
      decrypted = decipher.update(enc, undefined, "utf8");
      decrypted += decipher.final("utf8");
    } catch { }

    return decrypted;
  }
}