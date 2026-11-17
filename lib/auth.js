/**
 * Require Authorization: Bearer <API_SECRET> when API_SECRET is configured.
 * Returns true if the response was already sent (caller should return).
 */
export function requireApiAuth(req, res) {
  const secret = String(process.env.API_SECRET || '').trim();
  if (!secret) return false;

  const header = String(req.headers.authorization || '');
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim() || '';

  if (token && token === secret) return false;

  res.status(401).json({ error: 'Unauthorized' });
  return true;
}
