type LogLevel = "info" | "warn" | "error";

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export const logger = {
  info(context: string, message: string, ...args: unknown[]) {
    console.log(formatMessage("info", context, message), ...args);
  },

  warn(context: string, message: string, ...args: unknown[]) {
    console.warn(formatMessage("warn", context, message), ...args);
  },

  error(context: string, message: string, ...args: unknown[]) {
    console.error(formatMessage("error", context, message), ...args);
  },
};
