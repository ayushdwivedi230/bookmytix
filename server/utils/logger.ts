export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

function formatLog(payload: LogPayload): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(payload);
  }
  const prefix = `[${payload.timestamp}] [${payload.level.toUpperCase()}]${payload.context ? ` [${payload.context}]` : ''}:`;
  const extra = payload.data ? ` ${JSON.stringify(payload.data)}` : '';
  const err = payload.error ? `\n${payload.error.stack || payload.error.message}` : '';
  return `${prefix} ${payload.message}${extra}${err}`;
}

function createLogger(context?: string) {
  const log = (level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error) => {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    };
    const formatted = formatLog(payload);
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, error?: Error, data?: Record<string, unknown>) => log('error', message, data, error),
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    child: (subContext: string) => createLogger(context ? `${context}:${subContext}` : subContext),
  };
}

export const logger = createLogger('app');
