import { defineStore } from 'pinia';
import api, { apiErrorMessage } from '@/services/api.js';

export const useParametersStore = defineStore('parameters', {
  state: () => ({
    items: [],
    loading: false,
    error: '',
    countries: [],
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await api.get('/api/parameters');
        this.items = data;
      } catch (err) {
        this.error = apiErrorMessage(err, 'Failed to load parameters.');
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async fetchCountries() {
      if (this.countries.length) return;
      const { data } = await api.get('/api/countries');
      this.countries = data;
    },
    async create(payload) {
      const { data } = await api.post('/api/parameters', payload);
      this.items = [data, ...this.items];
      return data;
    },
    /**
     * Returns: { ok: true, parameter } on success, { ok: false, conflict, current } on 409.
     * Other errors propagate.
     */
    async update(id, payload) {
      try {
        const { data } = await api.patch(`/api/parameters/${encodeURIComponent(id)}`, payload);
        this.items = this.items.map((p) => (p.id === id ? data : p));
        return { ok: true, parameter: data };
      } catch (err) {
        if (err.response?.status === 409 && err.response.data?.error?.details?.current) {
          return { ok: false, conflict: true, current: err.response.data.error.details.current };
        }
        throw err;
      }
    },
    async remove(id, expectedVersion) {
      try {
        await api.delete(`/api/parameters/${encodeURIComponent(id)}`, {
          params: { expectedVersion },
        });
        this.items = this.items.filter((p) => p.id !== id);
        return { ok: true };
      } catch (err) {
        if (err.response?.status === 409 && err.response.data?.error?.details?.current) {
          return { ok: false, conflict: true, current: err.response.data.error.details.current };
        }
        throw err;
      }
    },
    async aiSuggest(id, targetCountries) {
      const { data } = await api.post(
        `/api/parameters/${encodeURIComponent(id)}/ai-suggestions`,
        targetCountries?.length ? { targetCountries } : {},
      );
      return data;
    },
  },
});
