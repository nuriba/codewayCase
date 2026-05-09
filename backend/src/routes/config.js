import { Router } from 'express';
import { authApiToken } from '../middleware/authApiToken.js';
import { CACHE_TTL_SECONDS, getServedConfig } from '../services/configCache.js';
import { listParameters } from '../services/parametersService.js';

const router = Router();

router.get('/config', authApiToken, async (req, res) => {
  const country = typeof req.query.country === 'string' ? req.query.country : null;
  const flat = await getServedConfig(country, listParameters);
  res.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
  res.json(flat);
});

export default router;
