/**
 * Logging utilities for qwen-auth plugin
 */

/** Log levels */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Logger configuration */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

/** Log level priority */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class for consistent logging
 */
export class Logger {
  private config: LoggerConfig;

  constructor(prefix: string = "qwen-auth", enabled: boolean = true, level: LogLevel = "info") {
    this.config = { prefix, enabled, level };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Format a log message
   */
  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.config.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(this.format("debug", message), ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.format("info", message), ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.format("warn", message), ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.format("error", message), ...args);
    }
  }

  /**
   * Create a child logger with a sub-prefix
   */
  child(subPrefix: string): Logger {
    return new Logger(`${this.config.prefix}:${subPrefix}`, this.config.enabled, this.config.level);
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(prefix: string = "qwen-auth", debug: boolean = false): Logger {
  return new Logger(prefix, true, debug ? "debug" : "info");
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create the global logger
 */
export function getLogger(debug?: boolean): Logger {
  if (!globalLogger) {
    globalLogger = createLogger("qwen-auth", debug);
  } else if (debug !== undefined) {
    globalLogger.setLevel(debug ? "debug" : "info");
  }
  return globalLogger;
}

/**
 * Initialize the global logger with config
 */
export function initLogger(debug: boolean = false): Logger {
  globalLogger = createLogger("qwen-auth", debug);
  return globalLogger;
}
