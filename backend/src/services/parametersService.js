import admin from 'firebase-admin';
import { db } from '../config/firebase.js';
import { Errors } from '../utils/errors.js';
import { normalizeCountryCode } from '../utils/countries.js';
import { configCache } from './configCache.js';

const COLLECTION = 'parameters';

function serialize(snap) {
  const data = snap.data();
  if (!data) return null;
  return {
    id: snap.id,
    key: data.key,
    value: data.value,
    description: data.description ?? '',
    countryOverrides: data.countryOverrides ?? {},
    version: data.version ?? 1,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    createdBy: data.createdBy ?? null,
    updatedBy: data.updatedBy ?? null,
  };
}

function sanitizeOverrides(raw) {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw Errors.badRequest('countryOverrides must be an object keyed by ISO 3166-1 alpha-2 codes');
  }
  const out = {};
  for (const [code, value] of Object.entries(raw)) {
    const norm = normalizeCountryCode(code);
    if (!norm) continue; // silently drop unknown codes per spec
    out[norm] = value;
  }
  return out;
}

export async function listParameters() {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(serialize);
}

export async function getParameter(id) {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) throw Errors.notFound(`Parameter "${id}" not found`);
  return serialize(doc);
}

export async function createParameter({ key, value, description, countryOverrides }, actor) {
  if (!key || typeof key !== 'string') throw Errors.badRequest('key is required');
  if (value === undefined) throw Errors.badRequest('value is required');

  const ref = db.collection(COLLECTION).doc(key);
  const overrides = sanitizeOverrides(countryOverrides);
  const audit = { uid: actor.uid, email: actor.email ?? null };
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      throw Errors.conflict(`Parameter "${key}" already exists`);
    }
    tx.set(ref, {
      key,
      value,
      description: description ?? '',
      countryOverrides: overrides,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      updatedBy: audit,
    });
  });

  configCache.flushAll();
  const created = await ref.get();
  return serialize(created);
}

export async function updateParameter(id, patch, actor) {
  const { expectedVersion } = patch;
  if (typeof expectedVersion !== 'number') {
    throw Errors.badRequest('expectedVersion is required and must be a number');
  }

  const ref = db.collection(COLLECTION).doc(id);
  const audit = { uid: actor.uid, email: actor.email ?? null };
  const now = admin.firestore.FieldValue.serverTimestamp();

  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Errors.notFound(`Parameter "${id}" not found`);
    const current = snap.data();
    if (current.version !== expectedVersion) {
      throw Errors.conflict('Parameter has been modified by another user', {
        current: serialize(snap),
      });
    }

    const updates = {
      version: (current.version ?? 1) + 1,
      updatedAt: now,
      updatedBy: audit,
    };
    if (patch.value !== undefined) updates.value = patch.value;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.countryOverrides !== undefined) {
      updates.countryOverrides = sanitizeOverrides(patch.countryOverrides);
    }

    tx.update(ref, updates);
    return { ...current, ...updates };
  });

  configCache.flushAll();
  // Re-read so timestamps are concrete rather than sentinel values.
  const fresh = await ref.get();
  return serialize(fresh) ?? updated;
}

export async function deleteParameter(id, expectedVersion) {
  if (typeof expectedVersion !== 'number') {
    throw Errors.badRequest('expectedVersion query parameter is required');
  }
  const ref = db.collection(COLLECTION).doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Errors.notFound(`Parameter "${id}" not found`);
    const current = snap.data();
    if (current.version !== expectedVersion) {
      throw Errors.conflict('Parameter has been modified by another user', {
        current: serialize(snap),
      });
    }
    tx.delete(ref);
  });

  configCache.flushAll();
}

export { sanitizeOverrides };
