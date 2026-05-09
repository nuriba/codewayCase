import { Router } from 'express';
import { z } from 'zod';
import { authFirebase } from '../middleware/authFirebase.js';
import { Errors } from '../utils/errors.js';
import {
  listParameters, getParameter, createParameter, updateParameter, deleteParameter,
} from '../services/parametersService.js';

const router = Router();
router.use(authFirebase);

const keyRegex = /^[A-Za-z0-9_.-]{1,128}$/;
const overridesSchema = z.record(z.string(), z.unknown()).optional();
const valueSchema = z.unknown(); // any JSON-serializable

const createSchema = z.object({
  key: z.string().regex(keyRegex, 'key must be 1-128 chars: letters, digits, _, ., -'),
  value: valueSchema,
  description: z.string().max(2000).optional().default(''),
  countryOverrides: overridesSchema,
});

const updateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  value: valueSchema.optional(),
  description: z.string().max(2000).optional(),
  countryOverrides: overridesSchema,
});

function parse(schema, payload) {
  const r = schema.safeParse(payload);
  if (!r.success) {
    const details = r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    throw Errors.badRequest('Invalid request body', { issues: details });
  }
  return r.data;
}

router.get('/', async (req, res) => {
  const items = await listParameters();
  items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  res.json(items);
});

router.get('/:id', async (req, res) => {
  res.json(await getParameter(req.params.id));
});

router.post('/', async (req, res) => {
  const data = parse(createSchema, req.body);
  const created = await createParameter(data, req.user);
  res.status(201).json(created);
});

router.patch('/:id', async (req, res) => {
  const data = parse(updateSchema, req.body);
  const updated = await updateParameter(req.params.id, data, req.user);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const expectedVersion = Number.parseInt(req.query.expectedVersion, 10);
  if (!Number.isFinite(expectedVersion)) {
    throw Errors.badRequest('expectedVersion query parameter is required');
  }
  await deleteParameter(req.params.id, expectedVersion);
  res.status(204).end();
});

export default router;
