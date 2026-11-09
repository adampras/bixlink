export const PASSWORD_HINT = 'Use at least 8 characters with letters and numbers (no spaces).';
export const passwordValid = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p) && !/\s/.test(p);
