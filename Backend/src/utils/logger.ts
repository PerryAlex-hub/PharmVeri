import winston from "winston";
import { config } from "../config/environment";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format,
    ),
  }),
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    format,
  }),
  new winston.transports.File({
    filename: "logs/all.log",
    format,
  }),
];

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  levels,
  format,
  transports,
});
