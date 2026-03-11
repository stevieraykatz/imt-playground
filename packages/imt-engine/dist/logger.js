/**
 * Configurable log levels for the IMT Engine HTTP server.
 *
 * Level ordering (least → most restrictive):
 *   debug → info → warn → error → silent
 *
 * The default level is "warn", which logs 4xx and 5xx responses only.
 */
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};
export const LOG_LEVELS = Object.keys(LOG_LEVEL_PRIORITY);
export const DEFAULT_LOG_LEVEL = 'warn';
export function isValidLogLevel(value) {
    return value in LOG_LEVEL_PRIORITY;
}
/**
 * Map an HTTP status code to the log level it represents.
 */
export function statusToLogLevel(status) {
    if (status >= 500)
        return 'error';
    if (status >= 400)
        return 'warn';
    if (status >= 300)
        return 'info';
    return 'info';
}
/**
 * Returns true when a message at `messageLevel` should be emitted
 * given the configured `configuredLevel`.
 */
export function shouldLog(messageLevel, configuredLevel) {
    return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[configuredLevel];
}
