export const LOGIN_IDENTIFIER_KEY = 'bixlink-login-identifier';

export async function createManualAccount<T>(
  signup: () => Promise<{ data: { session: T | null }; error: { message: string } | null }>,
  revoke: () => Promise<{ error: { message: string } | null }>,
) {
  const result = await signup();
  if (result.error) throw new Error(result.error.message);
  if (result.data.session) {
    const logout = await revoke();
    if (logout.error) throw new Error('Account created, but access could not be reset. Please try signing in manually.');
  }
  return { created: true, confirmationRequired: !result.data.session };
}