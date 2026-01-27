import axios from 'axios';
import type {
  RegistrationInput,
  RegistrationOutput,
  AuthenticationInput,
  AuthenticationOutput,
  CombinedInput,
  CombinedOutput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const calculatorApi = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Get configuration
  async getConfig() {
    const response = await api.get('/config');
    return response.data;
  },

  // Calculate Registration resources
  async calculateRegistration(input: RegistrationInput): Promise<RegistrationOutput> {
    const response = await api.post<RegistrationOutput>('/calculate/registration', input);
    return response.data;
  },

  // Calculate Authentication resources
  async calculateAuthentication(input: AuthenticationInput): Promise<AuthenticationOutput> {
    const response = await api.post<AuthenticationOutput>('/calculate/authentication', input);
    return response.data;
  },

  // Calculate Combined resources
  async calculateCombined(input: CombinedInput): Promise<CombinedOutput> {
    const response = await api.post<CombinedOutput>('/calculate/combined', input);
    return response.data;
  },

  // Get Registration services
  async getRegistrationServices() {
    const response = await api.get('/services/registration');
    return response.data;
  },

  // Get Authentication services
  async getAuthenticationServices() {
    const response = await api.get('/services/authentication');
    return response.data;
  },
};

export default calculatorApi;
