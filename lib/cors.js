export function applyCors(req, res) {
  const configured = String(process.env.CORS_ORIGIN || '*').trim();
  const requestOrigin = req.headers.origin || '';
  const allowedList = configured
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  let allowOrigin = '*';
  if (configured === '*') {
    allowOrigin = requestOrigin || '*';
  } else if (requestOrigin && allowedList.includes(requestOrigin)) {
    allowOrigin = requestOrigin;
  } else if (allowedList.length === 1) {
    allowOrigin = allowedList[0];
  }

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  if (allowOrigin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept',
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
