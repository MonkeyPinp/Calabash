const CALABASH_JSON_FILTERS = [{ name: 'Calabash JSON', extensions: ['json'] }];
const BOARD_EXPORT_FILTERS = {
  png: [{ name: 'PNG image', extensions: ['png'] }],
  pdf: [{ name: 'PDF document', extensions: ['pdf'] }],
};
const BACKUP_DIR = 'backups';

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export interface DesktopJsonFile {
  path: string;
  text: string;
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export async function openDesktopJsonFile(title: string): Promise<DesktopJsonFile | null> {
  if (!isDesktopRuntime()) return null;
  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const selected = await open({
    title,
    multiple: false,
    filters: CALABASH_JSON_FILTERS,
  });
  if (!selected || Array.isArray(selected)) return null;

  return {
    path: selected,
    text: await readTextFile(selected),
  };
}

export async function saveDesktopTextFile(input: {
  title: string;
  defaultPath: string;
  text: string;
}): Promise<string | null> {
  if (!isDesktopRuntime()) return null;
  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const selected = await save({
    title: input.title,
    defaultPath: input.defaultPath,
    filters: CALABASH_JSON_FILTERS,
  });
  if (!selected) return null;

  await writeTextFile(selected, input.text);
  return selected;
}

export async function saveDesktopBinaryFile(input: {
  title: string;
  defaultPath: string;
  bytes: Uint8Array;
  extension: 'png' | 'pdf';
}): Promise<string | null> {
  if (!isDesktopRuntime()) return null;
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const selected = await save({
    title: input.title,
    defaultPath: input.defaultPath,
    filters: BOARD_EXPORT_FILTERS[input.extension],
  });
  if (!selected) return null;

  await writeFile(selected, input.bytes);
  return selected;
}

export async function saveDesktopLibraryBackup(text: string): Promise<string> {
  if (!isDesktopRuntime()) throw new Error('Desktop runtime is not available');
  const [{ appDataDir, join }, { BaseDirectory, mkdir, writeTextFile }] = await Promise.all([
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-fs'),
  ]);

  await mkdir(BACKUP_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  const backupName = `calabash-library-backup-${formatTimestamp(new Date())}.calabash.json`;
  const relativePath = `${BACKUP_DIR}/${backupName}`;
  await writeTextFile(relativePath, text, { baseDir: BaseDirectory.AppData });

  return join(await appDataDir(), BACKUP_DIR, backupName);
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');
}
