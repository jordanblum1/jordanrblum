import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

let docClient: DynamoDBDocumentClient | undefined;

function getClient(): DynamoDBDocumentClient {
  if (!docClient) {
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }
  return docClient;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Atomically increments the counter at `pk` and reports whether it is still
 * within `limit`, in a single conditional UpdateItem call — avoids the
 * read-then-write race of a separate get + put.
 */
export async function atomicIncrementWithLimit(pk: string, limit: number, ttlSeconds: number): Promise<boolean> {
  const table = requireEnv('RATE_TABLE');
  try {
    await getClient().send(
      new UpdateCommand({
        TableName: table,
        Key: { pk },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :incr, #ttl = if_not_exists(#ttl, :ttlValue)',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':incr': 1,
          ':limit': limit,
          ':ttlValue': Math.floor(Date.now() / 1000) + ttlSeconds,
        },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw err;
  }
}
