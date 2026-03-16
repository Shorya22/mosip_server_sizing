import axios from 'axios';
import type {
  RegistrationInput,
  RegistrationOutput,
  AuthenticationInput,
  AuthenticationOutput,
  CombinedInput,
  CombinedOutput,
  VersionListResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const calculatorApi = {
  // Login
  async login(username: string, password: string): Promise<{ success: boolean; username: string }> {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Get available MOSIP versions
  async getVersions(): Promise<VersionListResponse> {
    const response = await api.get<VersionListResponse>('/versions');
    return response.data;
  },

  // Get configuration
  async getConfig(version?: string) {
    const params = version ? { version } : {};
    const response = await api.get('/config', { params });
    return response.data;
  },

  // Calculate Registration resources
  async calculateRegistration(input: RegistrationInput, version?: string): Promise<RegistrationOutput> {
    const params = version ? { version } : {};
    const response = await api.post<RegistrationOutput>('/calculate/registration', input, { params });
    return response.data;
  },

  // Calculate Authentication resources
  async calculateAuthentication(input: AuthenticationInput, version?: string): Promise<AuthenticationOutput> {
    const params = version ? { version } : {};
    const response = await api.post<AuthenticationOutput>('/calculate/authentication', input, { params });
    return response.data;
  },

  // Calculate Combined resources (version is included in input)
  async calculateCombined(input: CombinedInput): Promise<CombinedOutput> {
    const response = await api.post<CombinedOutput>('/calculate/combined', input);
    return response.data;
  },

  // Get Registration services
  async getRegistrationServices(version?: string) {
    const params = version ? { version } : {};
    const response = await api.get('/services/registration', { params });
    return response.data;
  },

  // Get Authentication services
  async getAuthenticationServices(version?: string) {
    const params = version ? { version } : {};
    const response = await api.get('/services/authentication', { params });
    return response.data;
  },
};

export default calculatorApi;
