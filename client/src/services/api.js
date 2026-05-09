import { getApiBase } from './getApiBase';

function getToken() {
  return localStorage.getItem('recomeco_token');
}

function setToken(token) {
  localStorage.setItem('recomeco_token', token);
}

function removeToken() {
  localStorage.removeItem('recomeco_token');
  localStorage.removeItem('recomeco_user');
}

function getUser() {
  const u = localStorage.getItem('recomeco_user');
  return u ? JSON.parse(u) : null;
}

function setUser(user) {
  localStorage.setItem('recomeco_user', JSON.stringify(user));
}

function buildHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

export const api = {
  async get(endpoint) {
    const res = await fetch(`${getApiBase()}${endpoint}`, {
      headers: buildHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${getApiBase()}${endpoint}`, {
        method: 'POST',
        headers: buildHeaders(),
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
      headers: buildHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${getApiBase()}${endpoint}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(err.error || 'Erro na requisição');
    }
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

      if (data.token) {
        setToken(data.token);
      }
      if (data.user) {
        setUser(data.user);
      }

      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Servidor offline. Tente novamente mais tarde.');
      }
      throw err;
    }
  },

  logout() {
    removeToken();
  },

  isAuthenticated() {
    return Boolean(getToken());
  },

  getUser() {
    return getUser();
  },

  async verify() {
    const token = getToken();
    if (!token) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        removeToken();
        return null;
      }

      if (!res.ok) return null;

      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
        return data.user;
      }
      return null;
    } catch {
      return null;
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

export const getVisitors = () => api.get('/api/visitors');
export const getVisitor = (id) => api.get(`/api/visitors/${id}`);
export const createVisitor = (data) => api.post('/api/visitors', data);
export const updateVisitor = (id, data) => api.put(`/api/visitors/${id}`, data);
export const deleteVisitor = (id) => api.delete(`/api/visitors/${id}`);
export const completeVisitorRegistration = (visitorId, data) => api.post(`/api/visitors/${visitorId}/complete-registration`, data);
export const sendVisitorToRecomeco = (id) => api.post(`/api/visitors/${id}/send-to-recomeco`, {});