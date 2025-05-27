/* eslint-disable @typescript-eslint/no-explicit-any */
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import inputOutputLogger from '@middy/input-output-logger';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { startLogger } from '../utils/logger';

const logger = startLogger('handlers');

export const base = (handler: APIGatewayProxyHandler) =>
  middy(handler, { timeoutEarlyInMillis: 0 })
    .use(cors())
    .use(
      inputOutputLogger({
        logger: ({ event, response }) => {
          if (event) {
            logger?.debug('request', {
              event,
            });
          } else if (response) {
            logger?.debug('response', {
              response,
            });
          }
        },
      }),
    )
    .use({
      onError: (handler) => {
        const { error } = handler;
        logger?.error('Internal server error', {
          error,
        });
      },
    });

export const http = (handler: APIGatewayProxyHandler) => base(handler).use(httpJsonBodyParser());
