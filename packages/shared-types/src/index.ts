// Shared API envelope & JWT payload — mirror di packages/shared-types.
export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface AccessTokenPayload {
  user_id: string;
  company_id: string;
  role_id: string;
}
