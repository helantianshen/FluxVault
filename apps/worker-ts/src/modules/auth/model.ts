export interface AdminAuthenticator {
  login(
    username: string,
    password: string,
  ): Promise<{ token: string; expiresAt: string }>;
  verify(token: string): Promise<void>;
}
