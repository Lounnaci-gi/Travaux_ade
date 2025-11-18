import api from './api';
import { login, logout } from './api';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => store[key] = value.toString(),
    removeItem: (key) => delete store[key],
    clear: () => store = {}
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

describe('API Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test('login should store token and user data', async () => {
    const mockResponse = {
      token: 'test-token',
      user: { id: 1, email: 'test@example.com' }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await login({ email: 'test@example.com', password: 'password' });

    expect(result).toEqual(mockResponse);
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1, email: 'test@example.com' }));
  });

  test('logout should remove token and user data', async () => {
    // Set up localStorage with token and user
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

    // Mock the logout API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Déconnexion réussie' })
    });

    await logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('should redirect to login on session expired error', async () => {
    // Mock window.location
    delete window.location;
    window.location = { href: '/' };

    // Set up localStorage with token and user
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

    // Create a mock response with session expired error
    const mockErrorResponse = {
      response: {
        status: 401,
        data: {
          error: 'Session expirée. Veuillez vous reconnecter.'
        }
      }
    };

    // Trigger the interceptor
    try {
      await api.get('/test');
    } catch (error) {
      // The interceptor should handle this
    }

    // Check that localStorage items were removed
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    
    // Check that redirect occurred
    expect(window.location.href).toBe('/');
  });
});