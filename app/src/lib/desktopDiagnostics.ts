import { isDesktopRuntime } from './desktopFiles';

export interface DesktopDiagnosticLogInput {
  area: string;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

export async function writeDesktopDiagnosticLog(input: DesktopDiagnosticLogInput): Promise<string | null> {
  if (!isDesktopRuntime()) return null;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('write_app_log', {
      entry: formatDiagnosticEntry(input),
    });
  } catch (error) {
    console.warn('Failed to write Calabash desktop diagnostic log', error);
    return null;
  }
}

function formatDiagnosticEntry(input: DesktopDiagnosticLogInput) {
  const lines = [
    `[${new Date().toISOString()}] ${input.area}: ${input.message}`,
  ];

  if (input.context) {
    lines.push(`context=${safeJson(input.context)}`);
  }

  if (input.error) {
    lines.push(formatError(input.error));
  }

  return lines.join('\n');
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return [
      `error.name=${error.name}`,
      `error.message=${error.message}`,
      error.stack ? `error.stack=${error.stack}` : null,
    ].filter(Boolean).join('\n');
  }

  return `error=${safeJson(error)}`;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
