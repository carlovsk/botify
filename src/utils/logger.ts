import { Logger } from '@aws-lambda-powertools/logger';
import { LogLevel } from '@aws-lambda-powertools/logger/types';

export const startLogger = (serviceName: string) =>
  new Logger({ serviceName, environment: process.env.STAGE, logLevel: process.env.LOG_LEVEL as LogLevel });
