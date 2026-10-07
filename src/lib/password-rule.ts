export const PASSWORD_HINT = 'Use 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.';
export const passwordValid = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p) && !/\s/.test(p);
