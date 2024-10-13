import vscode from "vscode";
import { SaveType, SSHTerminal } from "../utils/types";

export default class MessageHandler {
  // info
  public static async infoTerminalSave(res: SaveType, publicKey?: string): Promise<void> {
    const message = this.terminalMessage(res);
    
    if (!publicKey) {
      await vscode.window.showInformationMessage(message);
      return;
    }

    const btnCopyPublicKey = "Copy public key";
    const copyClipboard = await vscode.window.showInformationMessage(message, btnCopyPublicKey);
    if (copyClipboard !== btnCopyPublicKey) return;

    await vscode.env.clipboard.writeText(publicKey as string);
  }
  public static errorCreateTerminal(err: unknown): void {
    if (typeof err !== "object" || err === null) return;

    if ("message" in err && typeof err.message === "string" && err.message.length !== 0) {
      vscode.window.showErrorMessage(`Failed to connect: ${err.message}`);
    } else if ("code" in err && typeof err.code === "string" && err.code.length !== 0) {
      vscode.window.showErrorMessage(`Failed to connect: ${err.code}`);
    }
  }

  // warnings
  public static async warningNoTerminalsDefined(): Promise<void> {
    vscode.window.showErrorMessage("No terminals are defined!");
  }

  // errors
  public static async errorWorkspaceEmpty(): Promise<void> {
    vscode.window.showErrorMessage("Open a VSCode workspace!");
  }

  public static async errorConnectionDetailsNotProvided(): Promise<void> {
    vscode.window.showErrorMessage("Connection details are not provided!");
  }

  private static terminalMessage(res: SaveType): string {
    let ret = "";
    if (res.saved.length > 0) ret += "Terminals Saved: " + this.terminalStringify(res.saved) + "\n";
    if (res.edited.length > 0) ret += "Terminals Edited: " + this.terminalStringify(res.edited) + "\n";
    if (res.removed.length > 0) ret += "Terminals Removed: " + this.terminalStringify(res.removed) + "\n";

    return ret;
  }

  private static terminalStringify(terminals: SSHTerminal[]): string {
    return terminals.map(terminal => terminal.name).join(", ");
  }
}