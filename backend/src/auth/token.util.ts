import { createHmac } from 'crypto';

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  scope: 'access' | 'refresh';
  iat: number;
};

export function createSignedToken(payload: TokenPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  if (expectedSignature !== signature) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as TokenPayload;
  } catch {
    return null;
  }
}
