import { createAction } from '@reduxjs/toolkit';

export const sessionUnauthorized = createAction('session/unauthorized');
export const sessionTokensRefreshed = createAction<{ accessToken: string; refreshToken: string }>(
  'session/tokensRefreshed',
);
