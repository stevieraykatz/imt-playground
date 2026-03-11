/**
 * Configurable log levels for the IMT Engine HTTP server.
 *
 * Level ordering (least → most restrictive):
 *   debug → info → warn → error → silent
 *
 * The default level is "warn", which logs 4xx and 5xx responses only.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export declare const LOG_LEVELS: LogLevel[];
export declare const DEFAULT_LOG_LEVEL: LogLevel;
export declare function isValidLogLevel(value: string): value is LogLevel;
/**
 * Map an HTTP status code to the log level it represents.
 */
export declare function statusToLogLevel(status: number): LogLevel;
/**
 * Returns true when a message at `messageLevel` should be emitted
 * given the configured `configuredLevel`.
 */
export declare function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean;
//# sourceMappingURL=logger.d.ts.map