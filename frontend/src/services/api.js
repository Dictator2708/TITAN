const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('titan_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('titan_token', token);
    } else {
      localStorage.removeItem('titan_token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('titan_token');
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('titan_unauthorized'));
      }
      const errorMsg = data?.detail?.message || data?.detail || 'An error occurred';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    return data;
  }

  // --- Auth ---
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(email, password, full_name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateMe(userData) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // --- Chat & Assistant ---
  async sendMessage(content, conversation_id = null, requestOptions = {}) {
    return this.request('/chat/', {
      method: 'POST',
      body: JSON.stringify({ content, conversation_id }),
      signal: requestOptions.signal,
    });
  }

  // --- Conversations ---
  async listConversations(is_archived = false) {
    return this.request(`/conversations/?is_archived=${is_archived}`);
  }

  async createConversation(title = 'New Conversation') {
    return this.request('/conversations/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getConversation(conversationId) {
    return this.request(`/conversations/${conversationId}`);
  }

  async updateConversation(conversationId, data) {
    return this.request(`/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(conversationId) {
    return this.request(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // --- Tasks ---
  async listTasks(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    if (filters.due_date) params.append('due_date', filters.due_date);
    return this.request(`/tasks/?${params.toString()}`);
  }

  async createTask(taskData) {
    return this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async completeTask(taskId) {
    return this.request(`/tasks/${taskId}/complete`, {
      method: 'POST',
    });
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // --- Reminders ---
  async listReminders(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/reminders/${query}`);
  }

  async createReminder(reminderData) {
    return this.request('/reminders/', {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
  }

  async updateReminder(reminderId, reminderData) {
    return this.request(`/reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(reminderData),
    });
  }

  async deleteReminder(reminderId) {
    return this.request(`/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  }

  async pollNotifications() {
    return this.request('/reminders/notifications/poll');
  }

  // --- Notes ---
  async listNotes(search = '', is_pinned = null) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (is_pinned !== null) params.append('is_pinned', is_pinned);
    return this.request(`/notes/?${params.toString()}`);
  }

  async createNote(noteData) {
    return this.request('/notes/', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async updateNote(noteId, noteData) {
    return this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  async deleteNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // --- Memory ---
  async listMemories(category = null) {
    const query = category && category !== 'all' ? `?category=${category}` : '';
    return this.request(`/memories/${query}`);
  }

  async searchMemories(query, category = null) {
    const params = new URLSearchParams({ query });
    if (category && category !== 'all') params.append('category', category);
    return this.request(`/memories/search?${params.toString()}`);
  }

  async saveMemory(memoryData) {
    return this.request('/memories/', {
      method: 'POST',
      body: JSON.stringify(memoryData),
    });
  }

  async updateMemory(memoryId, memoryData) {
    return this.request(`/memories/${memoryId}`, {
      method: 'PUT',
      body: JSON.stringify(memoryData),
    });
  }

  async deleteMemory(memoryId) {
    return this.request(`/memories/${memoryId}`, {
      method: 'DELETE',
    });
  }

  // --- Activity & Daily Summary ---
  async listActivities(limit = 50, actionType = null) {
    const params = new URLSearchParams({ limit });
    if (actionType) params.append('action_type', actionType);
    return this.request(`/activity/?${params.toString()}`);
  }

  async getDailySummary() {
    return this.request('/activity/summary');
  }

  // --- Weather ---
  async getWeather(location = 'London', days = 3) {
    return this.request(`/weather/?location=${encodeURIComponent(location)}&days=${days}`);
  }

  // --- News ---
  async getNews(category = 'technology', query = '', page_size = 10) {
    const params = new URLSearchParams({ category, page_size });
    if (query) params.append('query', query);
    return this.request(`/news/?${params.toString()}`);
  }

  // --- Maps & Geocoding ---
  async searchLocations(query, limit = 5) {
    return this.request(`/maps/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // --- Voice ---
  async getVoiceToken(roomName = null) {
    return this.request('/voice/token', {
      method: 'POST',
      body: JSON.stringify({ room_name: roomName }),
    });
  }

  async getVoiceStatus() {
    return this.request('/voice/status');
  }

  // --- Gemini Live Voice ---
  async getGeminiLiveStatus() {
    return this.request('/voice/live/status');
  }

  getGeminiLiveWsUrl() {
    const token = this.getToken();
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${API_BASE}/voice/live/ws?token=${encodeURIComponent(token || '')}`;
  }

  // --- Settings ---
  async getSettings() {
    return this.request('/settings/');
  }

  async updateSettings(settingsData) {
    return this.request('/settings/', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // --- Health Diagnostics ---
  async checkHealth() {
    return this.request('/health/');
  }
}

export const api = new ApiClient();
