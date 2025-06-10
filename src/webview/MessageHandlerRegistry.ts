import * as vscode from 'vscode';

/**
 * Interface for message handlers
 */
export interface MessageHandler {
  /**
   * Handle a message from the webview
   * @param message The message received from the webview
   * @param provider The webview provider that received the message
   * @returns A boolean indicating whether the message was handled
   */
  handle(message: any, provider: any): boolean;
}

/**
 * Registry for webview message handlers
 */
export class MessageHandlerRegistry {
  private handlers: Map<string, MessageHandler> = new Map();

  /**
   * Register a handler for a specific message command
   * @param command The message command to handle
   * @param handler The handler for the command
   */
  public registerHandler(command: string, handler: MessageHandler): void {
    this.handlers.set(command, handler);
  }

  /**
   * Dispatch a message to the appropriate handler
   * @param message The message received from the webview
   * @param provider The webview provider that received the message
   * @returns A boolean indicating whether the message was handled
   */
  public dispatch(message: any, provider: any): boolean {
    const command = message.command;
    if (!command || !this.handlers.has(command)) {
      return false;
    }

    const handler = this.handlers.get(command)!;
    return handler.handle(message, provider);
  }

  /**
   * Check if a handler is registered for a command
   * @param command The command to check
   * @returns A boolean indicating whether a handler is registered
   */
  public hasHandler(command: string): boolean {
    return this.handlers.has(command);
  }

  /**
   * Get all registered commands
   * @returns An array of registered commands
   */
  public getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove a handler for a command
   * @param command The command to remove the handler for
   * @returns A boolean indicating whether a handler was removed
   */
  public removeHandler(command: string): boolean {
    return this.handlers.delete(command);
  }

  /**
   * Clear all registered handlers
   */
  public clear(): void {
    this.handlers.clear();
  }
}
