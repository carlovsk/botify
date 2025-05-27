import DynamoDB from 'aws-sdk/clients/dynamodb';
import { Entity } from 'electrodb';

const client = new DynamoDB.DocumentClient();

const table = `${process.env.SERVICE_NAME}-${process.env.SLS_STAGE}-Chat`;

export const Message = new Entity(
  {
    model: {
      entity: 'message',
      version: '1',
      service: 'chat',
    },
    attributes: {
      messageId: {
        type: 'string',
        required: true,
      },
      authorId: {
        type: 'string',
        required: true,
      },
      text: {
        type: 'string',
        required: true,
      },
      role: {
        type: ['user', 'system', 'assistant'] as const,
        required: true,
      },
      type: {
        type: ['message'] as const,
        required: true,
      },
    },
    indexes: {
      byMessageId: {
        pk: {
          field: 'pk',
          composite: ['authorId'],
        },
        sk: {
          field: 'sk',
          composite: ['messageId'],
        },
      },
    },
  },
  {
    client,
    table,
  },
);

export const Auth = new Entity(
  {
    model: {
      entity: 'authorization',
      version: '1',
      service: 'chat',
    },
    attributes: {
      type: {
        type: ['spotify'] as const,
        required: true,
      },
      accessToken: {
        type: 'string',
        required: true,
      },
      refreshToken: {
        type: 'string',
        required: true,
      },
      expiresIn: {
        type: 'number',
        required: true,
      },
      scope: {
        type: 'string',
        required: true,
      },
      tokenType: {
        type: 'string',
        required: true,
      },
    },
    indexes: {
      byType: {
        pk: {
          field: 'pk',
          composite: ['type'],
        },
        sk: {
          field: 'sk',
          composite: ['expiresIn'],
        },
      },
    },
  },
  {
    client,
    table,
  },
);
