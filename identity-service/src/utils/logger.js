const winston = require('winston');

// Creating a Winston logger instance with custom configurations
const logger = winston.createLogger({
    // Setting log level based on the environment
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // In production: logs only 'info', 'warn', and 'error' messages
    // In development: logs everything from 'debug' to 'error'

    // Defining the log format
    format: winston.format.combine(
        winston.format.timestamp(), // Adds a timestamp to logs
        winston.format.errors({ stack: true }), // Captures error stack traces
        winston.format.splat(), // Enables string interpolation for logs
        winston.format.json(), // Converts log messages to JSON format
    ),

    // Default metadata included in all logs
    defaultMeta: { service: 'identity-service' }, // Identifies which service generated the log

    // Transport mechanisms - define where logs should be stored
    transports: [
        // Console Transport: Logs messages to the terminal (useful for development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Adds colors to log levels for better readability
                winston.format.simple() // Outputs logs in a simple, human-readable format
            ),
        }),

        // File Transport (Error Logs): Stores only error-level logs in 'error-log'
        new winston.transports.File({ filename: 'error-log', level: 'error' }),

        // File Transport (All Logs): Stores all logs (debug, info, warn, error) in 'combined.log'
        new winston.transports.File({ filename: 'combined.log' }),
    ]
});

module.exports = logger;
