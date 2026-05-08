// API principal usando Supabase
import { supabaseApi } from './supabaseApi';

const API_BASE = '/api';

let authToken = localStorage.getItem('recomeco_token');

export const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!res.ok) throw new Error('Erro na requisição');
    return res.json();
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar');
      return result;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
      }
      throw err;
    }
  },

  async put(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro na requisição');
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!res.ok) throw new Error('Erro na requisição');
    return res.json();
  }
};

export const auth = {
  logout() {
    localStorage.removeItem('recomeco_token');
  },

  logout() {
    authToken = null;
    localStorage.removeItem('recomeco_token');
  },

  isAuthenticated() {
    return Boolean(authToken);
  },

  async verify() {
    if (!authToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }
};

// Exporta API do Supabase
export const getDashboard = () => supabaseApi.getDashboard();
export const getPeople = () => supabaseApi.getPeople();
export const getPerson = (id) => supabaseApi.getPerson(id);
export const createPerson = (data) => supabaseApi.createPerson(data);
export const updatePerson = (id, data) => supabaseApi.updatePerson(id, data);
export const deletePerson = (id) => supabaseApi.deletePerson(id);

export const getMentors = () => supabaseApi.getMentors();
export const getMentor = (id) => supabaseApi.getMentor(id);
export const createMentor = (data) => supabaseApi.createMentor(data);
export const updateMentor = (id, data) => supabaseApi.updateMentor(id, data);
export const deleteMentor = (id) => supabaseApi.deleteMentor(id);