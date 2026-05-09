<<<<<<< Updated upstream
// API usando backend Vercel
const API_BASE = import.meta.env.VITE_API_URL || 'https://recomeco-server.vercel.app';
=======
import { getApiBase } from './getApiBase';
>>>>>>> Stashed changes

let authToken = localStorage.getItem('recomeco_token');

export const api = {
  async get(endpoint) {
    const res = await fetch(`${getApiBase()}${endpoint}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!res.ok) throw new Error('Erro na requisição');
    return res.json();
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${getApiBase()}${endpoint}`, {
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
    const res = await fetch(`${getApiBase()}${endpoint}`, {
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
    const res = await fetch(`${getApiBase()}${endpoint}`, {
      method: 'DELETE',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!res.ok) throw new Error('Erro na requisição');
    return res.json();
  }
};

export const auth = {
  async login(email, password) {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }
      
      authToken = data.token;
      localStorage.setItem('recomeco_token', data.token);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Servidor offline. Tente novamente mais tarde.');
      }
      throw err;
    }
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
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }
};

export const getDashboard = () => api.get('/api/dashboard/summary');
export const getPeople = () => api.get('/api/people');
export const getPerson = (id) => api.get(`/api/people/${id}`);
export const createPerson = (data) => api.post('/api/people', data);
export const updatePerson = (id, data) => api.put(`/api/people/${id}`, data);
export const deletePerson = (id) => api.delete(`/api/people/${id}`);

export const getMentors = () => api.get('/api/mentors');
export const getMentor = (id) => api.get(`/api/mentors/${id}`);
export const createMentor = (data) => api.post('/api/mentors', data);
export const updateMentor = (id, data) => api.put(`/api/mentors/${id}`, data);
export const deleteMentor = (id) => api.delete(`/api/mentors/${id}`);