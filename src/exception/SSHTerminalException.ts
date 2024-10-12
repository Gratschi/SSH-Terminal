export default class SSHTerminalException extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}