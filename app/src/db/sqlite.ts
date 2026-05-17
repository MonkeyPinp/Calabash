import type { Book, Category, Character, EvidenceImage, GroupRange, Relationship, StickyNote, User } from '@/types';
import type { PortraitRow } from './schema';

const SQLITE_DB_PATH = 'sqlite:calabash.db';
const INDEXEDDB_MIGRATION_KEY = 'indexeddb-migrated-at';
const BASE64_CHUNK_SIZE = 0x8000;

type SqlColumnType = 'TEXT' | 'INTEGER' | 'REAL';
type SqlBindValue = string | number | null;
type RowWithId = { id: string };
type ModifyPatch<T> = Partial<T> | ((row: T) => void | boolean | Promise<void | boolean>);
type SqliteTransactionStatement = { query: string; bindValues: SqlBindValue[] };

interface SqlDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

interface LegacyTable<T> {
  toArray(): Promise<T[]>;
}

export interface LegacyCalabashDb {
  users: LegacyTable<User>;
  books: LegacyTable<Book>;
  categories: LegacyTable<Category>;
  characters: LegacyTable<Character>;
  relationships: LegacyTable<Relationship>;
  portraits: LegacyTable<PortraitRow>;
  annotations: LegacyTable<StickyNote>;
  groupRanges: LegacyTable<GroupRange>;
  evidenceImages: LegacyTable<EvidenceImage>;
  close(): void;
}

interface SqliteIndex<T> {
  column: string;
  type: SqlColumnType;
  value: (row: T) => unknown;
}

interface SqliteTableConfig<T extends RowWithId> {
  name: string;
  indexes: Record<string, SqliteIndex<T>>;
  serialize?: (row: T) => string;
  deserialize?: (payload: string) => T;
}

interface PayloadRow {
  payload: string;
}

interface CountRow {
  total: number | string | null;
}

interface MetadataRow {
  value: string;
}

export class SqliteCalabashDB {
  readonly users = new SqliteTable<User>(this, {
    name: 'users',
    indexes: {
      updatedAt: integerIndex((row) => row.updatedAt),
    },
  });

  readonly books = new SqliteTable<Book>(this, {
    name: 'books',
    indexes: {
      userId: textIndex((row) => row.userId),
      updatedAt: integerIndex((row) => row.updatedAt),
      categoryId: textIndex((row) => row.categoryId),
    },
  });

  readonly categories = new SqliteTable<Category>(this, {
    name: 'categories',
    indexes: {
      userId: textIndex((row) => row.userId),
      order: integerIndex((row) => row.order),
    },
  });

  readonly characters = new SqliteTable<Character>(this, {
    name: 'characters',
    indexes: {
      bookId: textIndex((row) => row.bookId),
      chapterIntroduced: integerIndex((row) => row.chapterIntroduced),
    },
  });

  readonly relationships = new SqliteTable<Relationship>(this, {
    name: 'relationships',
    indexes: {
      bookId: textIndex((row) => row.bookId),
      sourceId: textIndex((row) => row.sourceId),
      targetId: textIndex((row) => row.targetId),
      chapterRevealed: integerIndex((row) => row.chapterRevealed),
    },
  });

  readonly portraits = new SqliteTable<PortraitRow>(this, {
    name: 'portraits',
    indexes: {
      bookId: textIndex((row) => row.bookId),
    },
    serialize: serializePortraitForSqlite,
    deserialize: deserializePortraitFromSqlite,
  });

  readonly annotations = new SqliteTable<StickyNote>(this, {
    name: 'annotations',
    indexes: {
      bookId: textIndex((row) => row.bookId),
      chapterIntroduced: integerIndex((row) => row.chapterIntroduced),
    },
  });

  readonly groupRanges = new SqliteTable<GroupRange>(this, {
    name: 'groupRanges',
    indexes: {
      bookId: textIndex((row) => row.bookId),
      chapterIntroduced: integerIndex((row) => row.chapterIntroduced),
    },
  });

  readonly evidenceImages = new SqliteTable<EvidenceImage>(this, {
    name: 'evidenceImages',
    indexes: {
      bookId: textIndex((row) => row.bookId),
      chapterIntroduced: integerIndex((row) => row.chapterIntroduced),
    },
  });

  private sqlPromise: Promise<SqlDatabase> | null = null;
  private readyPromise: Promise<void> | null = null;
  private transactionStatements: SqliteTransactionStatement[] | null = null;

  constructor(private readonly legacyFactory: () => LegacyCalabashDb) {}

  async transaction<T>(
    _mode: string,
    _tables: unknown[],
    callback: () => T | Promise<T>,
  ): Promise<T> {
    await this.ensureReady();
    return this.runTransaction(callback);
  }

  async ensureReady(): Promise<void> {
    this.readyPromise ??= this.prepare().catch((error: unknown) => {
      this.readyPromise = null;
      throw error;
    });
    return this.readyPromise;
  }

  async executeSql(query: string, bindValues: unknown[] = []): Promise<unknown> {
    if (this.transactionStatements) {
      this.transactionStatements.push({
        query,
        bindValues: bindValues.map(toSqlBindValue),
      });
      return undefined;
    }

    const sql = await this.getSql();
    return sql.execute(query, bindValues);
  }

  async selectSql<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const sql = await this.getSql();
    return sql.select<T>(query, bindValues);
  }

  private async getSql(): Promise<SqlDatabase> {
    this.sqlPromise ??= import('@tauri-apps/plugin-sql')
      .then((module) => module.default.load(SQLITE_DB_PATH) as Promise<SqlDatabase>);
    return this.sqlPromise;
  }

  private async prepare(): Promise<void> {
    await this.createSchema();
    await this.migrateIndexedDbOnce();
  }

  private async createSchema(): Promise<void> {
    await this.executeSql(
      'CREATE TABLE IF NOT EXISTS "metadata" ("key" TEXT PRIMARY KEY NOT NULL, "value" TEXT NOT NULL)',
    );

    for (const table of this.dataTables) {
      await table.createSchemaDirect();
    }
  }

  private async migrateIndexedDbOnce(): Promise<void> {
    if (await this.getMetadata(INDEXEDDB_MIGRATION_KEY)) return;

    const legacy = this.legacyFactory();
    try {
      const [
        users,
        books,
        categories,
        characters,
        relationships,
        portraits,
        annotations,
        groupRanges,
        evidenceImages,
      ] = await Promise.all([
        legacy.users.toArray(),
        legacy.books.toArray(),
        legacy.categories.toArray(),
        legacy.characters.toArray(),
        legacy.relationships.toArray(),
        legacy.portraits.toArray(),
        legacy.annotations.toArray(),
        legacy.groupRanges.toArray(),
        legacy.evidenceImages.toArray(),
      ]);

      await this.runTransaction(async () => {
        await this.users.bulkPutDirect(users);
        await this.books.bulkPutDirect(books);
        await this.categories.bulkPutDirect(categories);
        await this.characters.bulkPutDirect(characters);
        await this.relationships.bulkPutDirect(relationships);
        await this.portraits.bulkPutDirect(portraits);
        await this.annotations.bulkPutDirect(annotations);
        await this.groupRanges.bulkPutDirect(groupRanges);
        await this.evidenceImages.bulkPutDirect(evidenceImages);
      });

      const migratedCount = users.length + books.length + categories.length + characters.length +
        relationships.length + portraits.length + annotations.length + groupRanges.length + evidenceImages.length;
      if (migratedCount > 0) {
        console.info(`[Calabash] Migrated ${migratedCount} IndexedDB rows to SQLite.`);
      }
    } finally {
      legacy.close();
    }

    await this.setMetadata(INDEXEDDB_MIGRATION_KEY, String(Date.now()));
  }

  private async getMetadata(key: string): Promise<string | undefined> {
    const rows = await this.selectSql<MetadataRow[]>(
      'SELECT "value" FROM "metadata" WHERE "key" = $1 LIMIT 1',
      [key],
    );
    return rows[0]?.value;
  }

  private async setMetadata(key: string, value: string): Promise<void> {
    await this.executeSql(
      'INSERT INTO "metadata" ("key", "value") VALUES ($1, $2) ' +
      'ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"',
      [key, value],
    );
  }

  private async runTransaction<T>(callback: () => T | Promise<T>): Promise<T> {
    if (this.transactionStatements) return callback();

    this.transactionStatements = [];
    try {
      const result = await callback();
      const statements = this.transactionStatements;
      if (statements.length > 0) {
        await this.executeSqliteTransaction(statements);
      }
      return result;
    } finally {
      this.transactionStatements = null;
    }
  }

  private async executeSqliteTransaction(statements: SqliteTransactionStatement[]): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('execute_sqlite_transaction', {
      db: SQLITE_DB_PATH,
      statements,
    });
  }

  private get dataTables(): Array<SqliteTable<RowWithId>> {
    return [
      this.users,
      this.books,
      this.categories,
      this.characters,
      this.relationships,
      this.portraits,
      this.annotations,
      this.groupRanges,
      this.evidenceImages,
    ] as unknown as Array<SqliteTable<RowWithId>>;
  }
}

class SqliteTable<T extends RowWithId> {
  private readonly config: SqliteTableConfig<T>;

  constructor(
    private readonly owner: SqliteCalabashDB,
    config: SqliteTableConfig<T>,
  ) {
    this.config = {
      ...config,
      indexes: Object.fromEntries(
        Object.entries(config.indexes).map(([field, index]) => [
          field,
          { ...index, column: index.column || field },
        ]),
      ) as Record<string, SqliteIndex<T>>,
    };
  }

  async add(row: T): Promise<void> {
    await this.owner.ensureReady();
    await this.insertDirect(row);
  }

  async put(row: T): Promise<void> {
    await this.owner.ensureReady();
    await this.putDirect(row);
  }

  async bulkAdd(rows: T[]): Promise<void> {
    await this.owner.ensureReady();
    for (const row of rows) await this.insertDirect(row);
  }

  async bulkPut(rows: T[]): Promise<void> {
    await this.owner.ensureReady();
    await this.bulkPutDirect(rows);
  }

  async get(id: string): Promise<T | undefined> {
    await this.owner.ensureReady();
    const rows = await this.owner.selectSql<PayloadRow[]>(
      `SELECT "payload" FROM ${quoteIdentifier(this.config.name)} WHERE "id" = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? this.deserialize(rows[0].payload) : undefined;
  }

  async delete(id: string): Promise<void> {
    await this.owner.ensureReady();
    await this.deleteDirect(id);
  }

  async clear(): Promise<void> {
    await this.owner.ensureReady();
    await this.owner.executeSql(`DELETE FROM ${quoteIdentifier(this.config.name)}`);
  }

  async toArray(): Promise<T[]> {
    await this.owner.ensureReady();
    return this.toArrayDirect();
  }

  async count(): Promise<number> {
    await this.owner.ensureReady();
    return this.countDirect();
  }

  where(field: string): { equals: (value: unknown) => SqliteWhereCollection<T> } {
    return {
      equals: (value: unknown) => new SqliteWhereCollection(this, field, value),
    };
  }

  filter(predicate: (row: T) => boolean): SqliteFilterCollection<T> {
    return new SqliteFilterCollection(this, predicate);
  }

  async ensureReady(): Promise<void> {
    await this.owner.ensureReady();
  }

  async createSchemaDirect(): Promise<void> {
    const columns = [
      '"id" TEXT PRIMARY KEY NOT NULL',
      '"payload" TEXT NOT NULL',
      ...Object.values(this.config.indexes).map((index) =>
        `${quoteIdentifier(index.column)} ${index.type}`,
      ),
    ];

    await this.owner.executeSql(
      `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.config.name)} (${columns.join(', ')})`,
    );

    for (const index of Object.values(this.config.indexes)) {
      await this.owner.executeSql(
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${this.config.name}_${index.column}`)} ` +
        `ON ${quoteIdentifier(this.config.name)} (${quoteIdentifier(index.column)})`,
      );
    }
  }

  async bulkPutDirect(rows: T[]): Promise<void> {
    for (const row of rows) await this.putDirect(row);
  }

  async countDirect(): Promise<number> {
    const rows = await this.owner.selectSql<CountRow[]>(
      `SELECT COUNT(*) AS "total" FROM ${quoteIdentifier(this.config.name)}`,
    );
    return Number(rows[0]?.total ?? 0);
  }

  async toArrayDirect(): Promise<T[]> {
    const rows = await this.owner.selectSql<PayloadRow[]>(
      `SELECT "payload" FROM ${quoteIdentifier(this.config.name)}`,
    );
    return rows.map((row) => this.deserialize(row.payload));
  }

  async toArrayByFieldDirect(field: string, value: unknown): Promise<T[]> {
    const index = this.indexForField(field);
    const { whereSql, bindValues } = equalityClause(index.column, value);
    const rows = await this.owner.selectSql<PayloadRow[]>(
      `SELECT "payload" FROM ${quoteIdentifier(this.config.name)} WHERE ${whereSql}`,
      bindValues,
    );
    return rows.map((row) => this.deserialize(row.payload));
  }

  async countByFieldDirect(field: string, value: unknown): Promise<number> {
    const index = this.indexForField(field);
    const { whereSql, bindValues } = equalityClause(index.column, value);
    const rows = await this.owner.selectSql<CountRow[]>(
      `SELECT COUNT(*) AS "total" FROM ${quoteIdentifier(this.config.name)} WHERE ${whereSql}`,
      bindValues,
    );
    return Number(rows[0]?.total ?? 0);
  }

  async deleteByFieldDirect(field: string, value: unknown): Promise<number> {
    const count = await this.countByFieldDirect(field, value);
    const index = this.indexForField(field);
    const { whereSql, bindValues } = equalityClause(index.column, value);
    await this.owner.executeSql(
      `DELETE FROM ${quoteIdentifier(this.config.name)} WHERE ${whereSql}`,
      bindValues,
    );
    return count;
  }

  async deleteDirect(id: string): Promise<void> {
    await this.owner.executeSql(
      `DELETE FROM ${quoteIdentifier(this.config.name)} WHERE "id" = $1`,
      [id],
    );
  }

  async putDirect(row: T): Promise<void> {
    await this.writeDirect(row, 'upsert');
  }

  private async insertDirect(row: T): Promise<void> {
    await this.writeDirect(row, 'insert');
  }

  private async writeDirect(row: T, mode: 'insert' | 'upsert'): Promise<void> {
    const columnEntries = [
      { column: 'id', value: row.id },
      { column: 'payload', value: this.serialize(row) },
      ...Object.values(this.config.indexes).map((index) => ({
        column: index.column,
        value: toSqlBindValue(index.value(row)),
      })),
    ];
    const columns = columnEntries.map((entry) => quoteIdentifier(entry.column));
    const placeholders = columnEntries.map((_, index) => `$${index + 1}`);
    const values = columnEntries.map((entry) => entry.value);

    if (mode === 'insert') {
      await this.owner.executeSql(
        `INSERT INTO ${quoteIdentifier(this.config.name)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values,
      );
      return;
    }

    const updates = columnEntries
      .filter((entry) => entry.column !== 'id')
      .map((entry) => `${quoteIdentifier(entry.column)} = excluded.${quoteIdentifier(entry.column)}`);

    await this.owner.executeSql(
      `INSERT INTO ${quoteIdentifier(this.config.name)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ` +
      `ON CONFLICT("id") DO UPDATE SET ${updates.join(', ')}`,
      values,
    );
  }

  private indexForField(field: string): SqliteIndex<T> {
    if (field === 'id') {
      return {
        column: 'id',
        type: 'TEXT',
        value: (row: T) => row.id,
      };
    }
    const index = this.config.indexes[field];
    if (!index) throw new Error(`SQLite table ${this.config.name} does not index ${field}`);
    return index;
  }

  private serialize(row: T): string {
    return this.config.serialize ? this.config.serialize(row) : JSON.stringify(row);
  }

  private deserialize(payload: string): T {
    return this.config.deserialize ? this.config.deserialize(payload) : JSON.parse(payload) as T;
  }
}

class SqliteWhereCollection<T extends RowWithId> {
  constructor(
    private readonly table: SqliteTable<T>,
    private readonly field: string,
    private readonly value: unknown,
  ) {}

  async toArray(): Promise<T[]> {
    await this.table.ensureReady();
    return this.table.toArrayByFieldDirect(this.field, this.value);
  }

  async first(): Promise<T | undefined> {
    return (await this.toArray())[0];
  }

  async count(): Promise<number> {
    await this.table.ensureReady();
    return this.table.countByFieldDirect(this.field, this.value);
  }

  async delete(): Promise<number> {
    await this.table.ensureReady();
    return this.table.deleteByFieldDirect(this.field, this.value);
  }

  async modify(patch: ModifyPatch<T>): Promise<number> {
    const rows = await this.toArray();
    for (const row of rows) {
      const next = await applyModifyPatch(row, patch);
      if (next) await this.table.putDirect(next);
    }
    return rows.length;
  }
}

class SqliteFilterCollection<T extends RowWithId> {
  constructor(
    private readonly table: SqliteTable<T>,
    private readonly predicate: (row: T) => boolean,
  ) {}

  async toArray(): Promise<T[]> {
    return (await this.table.toArray()).filter(this.predicate);
  }

  async first(): Promise<T | undefined> {
    return (await this.toArray())[0];
  }

  async count(): Promise<number> {
    return (await this.toArray()).length;
  }

  async delete(): Promise<number> {
    const rows = await this.toArray();
    for (const row of rows) await this.table.deleteDirect(row.id);
    return rows.length;
  }

  async modify(patch: ModifyPatch<T>): Promise<number> {
    const rows = await this.toArray();
    for (const row of rows) {
      const next = await applyModifyPatch(row, patch);
      if (next) await this.table.putDirect(next);
    }
    return rows.length;
  }
}

export function serializePortraitForSqlite(row: PortraitRow): string {
  const { blobBuffer, ...rest } = row;
  return JSON.stringify({
    ...rest,
    blobBase64: arrayBufferToBase64(blobBuffer),
  });
}

export function deserializePortraitFromSqlite(payload: string): PortraitRow {
  const raw = JSON.parse(payload) as Omit<PortraitRow, 'blobBuffer'> & { blobBase64?: string };
  return {
    id: raw.id,
    bookId: raw.bookId,
    mimeType: raw.mimeType,
    createdAt: Number(raw.createdAt ?? 0),
    blobBuffer: base64ToArrayBuffer(raw.blobBase64 ?? ''),
  };
}

async function applyModifyPatch<T extends RowWithId>(row: T, patch: ModifyPatch<T>): Promise<T | null> {
  const next = { ...row };
  if (typeof patch === 'function') {
    const result = await patch(next);
    return result === false ? null : next;
  }
  Object.assign(next, patch);
  return next;
}

function integerIndex<T>(value: (row: T) => unknown): SqliteIndex<T> {
  return { column: '', type: 'INTEGER', value };
}

function textIndex<T>(value: (row: T) => unknown): SqliteIndex<T> {
  return { column: '', type: 'TEXT', value };
}

function toSqlBindValue(value: unknown): SqlBindValue {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  return String(value);
}

function equalityClause(column: string, value: unknown): { whereSql: string; bindValues: SqlBindValue[] } {
  if (value == null) return { whereSql: `${quoteIdentifier(column)} IS NULL`, bindValues: [] };
  return { whereSql: `${quoteIdentifier(column)} = $1`, bindValues: [toSqlBindValue(value)] };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
