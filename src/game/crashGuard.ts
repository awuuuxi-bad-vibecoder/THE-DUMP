export interface CrashReport {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  stack: string;
  context: Record<string, string | number | boolean>;
  breadcrumbs: string[];
}

const CRASH_STORAGE_KEY = 'the_dump_last_crash_v1';
const MAX_BREADCRUMBS = 24;

type CrashListener = (report: CrashReport | null) => void;

class CrashGuardManager {
  private breadcrumbs: string[] = [];
  private context: Record<string, string | number | boolean> = {};
  private listeners = new Set<CrashListener>();
  private currentCrash: CrashReport | null = null;
  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const saved = localStorage.getItem(CRASH_STORAGE_KEY);
      if (saved) {
        this.currentCrash = JSON.parse(saved) as CrashReport;
      }
    } catch {
      // ignore storage errors
    }

    window.addEventListener('error', (event) => {
      const err = event.error instanceof Error ? event.error : new Error(event.message || 'Unknown window error');
      this.reportError('window.error', err);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const err =
        reason instanceof Error
          ? reason
          : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason ?? 'Unhandled rejection'));
      this.reportError('unhandledrejection', err);
    });
  }

  public setContext(key: string, value: string | number | boolean) {
    this.context[key] = value;
  }

  public log(event: string) {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    this.breadcrumbs.push(`[${ts}] ${event}`);
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  public reportError(source: string, error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const report: CrashReport = {
      id: `crash_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source,
      message: err.message || 'Unknown error',
      stack: err.stack || '(no stack trace)',
      context: {
        ...this.context,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    this.currentCrash = report;
    try {
      localStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(report));
    } catch {
      // ignore
    }

    this.listeners.forEach((cb) => cb(report));
  }

  public getCrash(): CrashReport | null {
    return this.currentCrash;
  }

  public clearCrash() {
    this.currentCrash = null;
    try {
      localStorage.removeItem(CRASH_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.listeners.forEach((cb) => cb(null));
  }

  public subscribe(cb: CrashListener): () => void {
    this.listeners.add(cb);
    cb(this.currentCrash);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public formatReportText(report: CrashReport): string {
    const ctxLines = Object.entries(report.context)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');
    const crumbs = report.breadcrumbs.join('\n');
    return [
      `=== THE_DUMP CRASH REPORT ===`,
      `Time: ${report.timestamp}`,
      `Source: ${report.source}`,
      `Message: ${report.message}`,
      ``,
      `Context:`,
      ctxLines || '  (none)',
      ``,
      `Recent Events:`,
      crumbs || '  (none)',
      ``,
      `Stack Trace:`,
      report.stack,
    ].join('\n');
  }
}

export const crashGuard = new CrashGuardManager();
