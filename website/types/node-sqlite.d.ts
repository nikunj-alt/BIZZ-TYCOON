// Ambient type declarations for `node:sqlite` (requires Node.js 22.5+ / 24).
// The runtime API is built into Node, but @types/node < 22 does not ship types.

declare module 'node:sqlite' {
  interface DatabaseSyncOptions {
    readOnly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    enableForeignKeyConstraints?: boolean;
  }

  interface StatementSync {
    all(...anonymousParameters: unknown[]): unknown[];
    get(...anonymousParameters: unknown[]): unknown;
    run(...anonymousParameters: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  }

  class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
    readonly isOpen: boolean;
  }
}
