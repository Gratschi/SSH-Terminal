declare module "vscode" {
  export interface QuickPickItem<P = any> {
    payload?: P
  }

  /**
   * A memento object that stores state independent
   * of the current opened {@link workspace.workspaceFolders workspace}.
   * 
   * Set the keys whose values should be synchronized across devices when synchronizing user-data
   * like configuration, extensions, and mementos.
   *
   * Note that this function defines the whole set of keys whose values are synchronized:
   *  - calling it with an empty array stops synchronization for this memento
   *  - calling it with a non-empty array replaces all keys whose values are synchronized
   *
   * For any given set of keys this function needs to be called only once but there is no harm in
   * repeatedly calling it.
   *
   * @param keys The set of keys whose values are synced.
   */
  export type GlobalState = ExtensionContext['globalState'];

  /**
	 * An extension context is a collection of utilities private to an
	 * extension.
	 *
	 * An instance of an `ExtensionContext` is provided as the first
	 * parameter to the `activate`-call of an extension.
	 */
  export interface ExtensionContext {
    readonly globalState: GlobalState
  }

  /**
   * Options for the text document listeners
   * 
   * The pattern will override any other fileName checks
   * 
   * @param once Only runs once after save (checks if there are any changes)
   * @param pattern Regex pattern which checks if it matches the text documents fileName
   * @param fileNames Checks if the fileName or if one of the fileNames is the same as the text documents fileName
   * @param language Checks if the language id is the same as the text documents language id
   */
  export interface TextDocumentOptions {
    once?: boolean,
    onMount?: boolean,
    pattern?: RegExp | string,
    fileNames?: string | string[],
    language?: string,
  }
}