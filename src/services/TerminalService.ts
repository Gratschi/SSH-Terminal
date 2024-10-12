import vscode from "vscode";
import { NodeSSH } from "node-ssh";
import { ClientChannel } from "ssh2";
import { Envs, SSHTerminal } from "../utils/types";
import ConfigService from "./ConfigService";
import MessageHandler from "./MessageHandler";

export default class TerminalService {
  private readonly MAX_CONNECTION_RETRIES = 3;
  private readonly SHELL_INIT_TIMEOUT = 30; // ms

  constructor(private readonly config: ConfigService) { }
  
  public async connectTerminal(vscodeTerminal: vscode.Terminal): Promise<void> {
    const config = await this.loadTerminalConfig(vscodeTerminal);

    if (!config) return;
    
    const terminalCreated = await this.createTerminal(config);
    if (terminalCreated) vscodeTerminal.dispose();
  }
  
  public async createTerminal(config: SSHTerminal): Promise<boolean> {
    const ssh = new NodeSSH();
    const writeEmitter = new vscode.EventEmitter<string>();
    const closeEmitter = new vscode.EventEmitter<number>();

    let password: string | undefined = config.ssh.password;

    let tries = 0;
    while (tries < this.MAX_CONNECTION_RETRIES) {
      if (tries !== 0) {
        password = await vscode.window.showInputBox({ prompt: "Enter SSH Password", password: true });
      }

      if (!config.ssh.key && !password) {
        MessageHandler.errorConnectionDetailsNotProvided();
        return false;
      }

      try {
        await ssh.connect({ host: config.ssh.host, username: config.ssh.user, port: config.ssh.port, password: password, privateKeyPath: config.ssh.key });
        const socket = await ssh.requestShell();

        const terminal = this.getPseudoTerminal(config, socket, writeEmitter, closeEmitter);
          
        const pid = await terminal.processId;
        if (!pid) return false;
          
        const date = new Date();
        socket.once("data", (data: Buffer) => {
          this.greetingMessage(
            socket,
            data,
            date,
            config.env,
            config.args
          );
        });
  
        socket.on("data", (data: Buffer) => {
          writeEmitter.fire(data.toString());
        });
        
        socket.on("close", (data: Buffer) => {
          // TODO: send close message with close after pressing enter
          writeEmitter.fire(`Exit with code: ${data.toString()}`);
          // TODO: after pressing enter on current terminal fire closeEmitter
          closeEmitter.fire(Number(data));
          ssh.dispose();
        });
        
        terminal.show();
        tries = this.MAX_CONNECTION_RETRIES;
      } catch (err) {
        tries++;
        console.error(err);
        ssh.dispose();
      
        MessageHandler.errorCreateTerminal(err);
        if (tries >= this.MAX_CONNECTION_RETRIES) {
          return false;
        }
      }
    }
    
    return true;
  }

  private async loadTerminalConfig(terminal: vscode.Terminal): Promise<SSHTerminal | undefined> {
    // Name is only defined if terminal has (overrideName = true)
    const name = terminal.creationOptions.name;
    if (!name) return;

    return this.config.loadTerminal(name);
  }

  private getPseudoTerminal(terminal: SSHTerminal, socket: ClientChannel, writeEmitter: vscode.EventEmitter<string>, closeEmitter: vscode.EventEmitter<number>): vscode.Terminal {
    const pty: vscode.Pseudoterminal = {
      onDidWrite: writeEmitter.event,
      onDidClose: closeEmitter.event,
      open: () => { socket.write("clear;\n"); },
      close: () => { },
      handleInput: (data: string) => {
        socket.write(data);
      }
    };

    const options: vscode.ExtensionTerminalOptions & vscode.TerminalOptions = {
      name: terminal.name,
      pty: pty,
      color: terminal.color,
      env: terminal.env,
      shellArgs: terminal.args
    };

    return vscode.window.createTerminal(options);
  }

  private async greetingMessage(
    socket: ClientChannel,
    data: Buffer,
    loaded: Date,
    envs?: Envs,
    args?: string | string[]
  ): Promise<void> {
    const initMessage = "Opened with VSCode SSH Terminal";

    // checks if there is no message sent after connection in the first SHELL_INIT_TIMEOUT ms
    if ((new Date().getTime() - this.SHELL_INIT_TIMEOUT) > loaded.getTime()) {
      this.writeEnvs(socket, envs);
      socket.write(`echo \"${initMessage}\"\n\n\n;\n`, "utf-8");
      this.writeArgs(socket, args);
      return;
    }

    // TODO: check if work on linux
    // remove newlines (\r)
    const converted = data.filter(char => char !== 13);

    this.writeEnvs(socket, envs);
    socket.write(`clear;echo \"${initMessage}\n\n\n\";echo \"${converted}\";\n`, "utf-8");
    this.writeArgs(socket, args);
  }

  private writeEnvs(socket: ClientChannel, envs?: Envs): void {
    if (!envs) return;
    
    const shellEnvs = Object.entries(envs)
      .map(([key, value]) => {
        return `${key}=${value}`;
      })
      .join(";");

    socket.write(`${shellEnvs};\n`, "utf-8");
  }

  private writeArgs(socket: ClientChannel, args?: string | string[]): void {
    if (!args) return;
  
    const shellArgs = typeof args === "string" ? [args] : args;
    shellArgs.forEach(arg => {
      socket.write(`${arg}\n`, "utf-8");
    });
  }
};