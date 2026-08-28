/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { date, foreignKey, index, integer, jsonb, pgTable, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").notNull(),
  round: varchar("round", { length: 50 }).notNull(),
  matchIndex: integer("match_index").notNull().default(0),
  player1Id: uuid("player1_id"),
  player2Id: uuid("player2_id"),
  score1: integer("score1").default(0),
  score2: integer("score2").default(0),
  winnerId: uuid("winner_id"),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  bracket: varchar("bracket", { length: 20 }).default('main'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_matches_tournament_id").on(table.tournamentId),
  index("idx_matches_round").on(table.tournamentId, table.round),
  uniqueIndex("idx_matches_tournament_round_matchindex_bracket_unique").on(table.tournamentId, table.round, table.matchIndex, table.bracket),
  foreignKey({
    columns: [table.tournamentId],
    foreignColumns: [tournaments.id],
    name: "matches_tournament_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.player1Id],
    foreignColumns: [players.id],
    name: "matches_player1_id_fkey",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.player2Id],
    foreignColumns: [players.id],
    name: "matches_player2_id_fkey",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.winnerId],
    foreignColumns: [players.id],
    name: "matches_winner_id_fkey",
  }).onDelete("set null"),
]);

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  bey: varchar("bey", { length: 100 }),
  seed: integer("seed"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_players_tournament_id").on(table.tournamentId),
  foreignKey({
    columns: [table.tournamentId],
    foreignColumns: [tournaments.id],
    name: "players_tournament_id_fkey",
  }).onDelete("cascade"),
]);

export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  format: varchar("format", { length: 30 }).notNull().default('single_elimination'),
  maxPlayers: integer("max_players").notNull().default(32),
  winScore: integer("win_score").notNull().default(3),
  swissRounds: integer("swiss_rounds").default(0),
  tournamentDate: date("tournament_date"),
  location: varchar("location", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  signupStatus: varchar("signup_status", { length: 20 }).notNull().default('closed'),
  settings: jsonb("settings"),
  adminKey: varchar("admin_key", { length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

// table aliases
export const matchesTable = matches;
export const playersTable = players;
export const tournamentsTable = tournaments;
