export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: number;
  meta?: any;
};

const MAX_LOGS = 500;
let logs: LogEntry[] = [];
const listeners: Set<(items: LogEntry[]) => void> = new Set();

function notify() {
  const snapshot = [...logs];
  listeners.forEach((l) => l(snapshot));
}

function push(level: LogLevel, message: string, meta?: any) {
  const entry: LogEntry = { level, message, timestamp: Date.now(), meta };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs = logs.slice(-MAX_LOGS);
  notify();
}

const Logger = {
  debug: (msg: string, meta?: any) => push('debug', msg, meta),
  info: (msg: string, meta?: any) => push('info', msg, meta),
  warn: (msg: string, meta?: any) => push('warn', msg, meta),
  error: (msg: string, meta?: any) => push('error', msg, meta),
  getLogs: () => [...logs],
  clear: () => {
    logs = [];
    notify();
  },
  subscribe: (fn: (items: LogEntry[]) => void) => {
    listeners.add(fn);
    fn([...logs]);
    return () => listeners.delete(fn);
  },
};

export default Logger;
