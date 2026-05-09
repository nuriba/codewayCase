import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authFirebase } from '../middleware/authFirebase.js';
import { Errors } from '../utils/errors.js';
import { suggestForParameter } from '../services/aiService.js';

const router = Router();
router.use(authFirebase);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  handler: (_req, _res, next) => next(Errors.tooManyRequests('AI suggestion rate limit exceeded (10/min)')),
});

const bodySchema = z.object({
  targetCountries: z.array(z.string()).max(50).optional(),
}).optional().default({});

router.post('/parameters/:id/ai-suggestions', limiter, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw Errors.badRequest('Invalid request body', {
      issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const result = await suggestForParameter(req.params.id, parsed.data);
  res.json(result);
});

export default router;
