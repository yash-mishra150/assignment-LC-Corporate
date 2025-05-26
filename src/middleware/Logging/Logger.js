const { createLogger, transports, format } = require('winston');
const chalk = require('chalk');
// const DailyRotateFile = require('winston-daily-rotate-file');
// const fs = require('fs');
// const path = require('path');

// const logDirectory = path.resolve('logs');

// // Create log directory if it does not exist
// if (!fs.existsSync(logDirectory)) {
//   fs.mkdirSync(logDirectory);
// }

// Custom log format with colors
const customFormat = format.printf(({ level, message, timestamp, stack }) => {
  const levelColors = {
    error: chalk.red.bold,
    warn: chalk.yellow.bold,
    info: chalk.blue.bold,
    debug: chalk.green.bold,
  };

  const colorize = levelColors[level] || chalk.white;
  return `${chalk.gray(`[${timestamp}]`)} ${colorize(level.toUpperCase())}: ${stack || message}`;
});

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    new transports.Console()
  ],
  exceptionHandlers: [
    new transports.Console()
  ],
  exitOnError: false,
});

// File storage commented out for now
// transports.push(
//   new DailyRotateFile({
//     filename: `${logDirectory}/%DATE%.log`,
//     datePattern: 'YYYY-MM-DD',
//     zippedArchive: true,
//     maxSize: '20m',
//     maxFiles: '14d',
//     format: format.combine(format.timestamp(), format.json()),
//   })
// );

// transports.push(
//   new DailyRotateFile({
//     filename: `${logDirectory}/exceptions-%DATE%.log`,
//     datePattern: 'YYYY-MM-DD',
//     zippedArchive: true,
//     maxSize: '20m',
//     maxFiles: '14d',
//     format: format.combine(format.timestamp(), format.json()),
//   })
// );

module.exports = logger;