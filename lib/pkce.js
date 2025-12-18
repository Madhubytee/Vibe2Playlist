//To verify the code challenge and code verifier. The code will generate a veridier and a challenge based on the provided verifier.
import crypto from 'crypto';

export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}
