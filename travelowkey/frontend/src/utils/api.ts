import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Generic POST request
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Generic PUT request
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Generic DELETE request
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

export const apiClient = new ApiClient();

// Auth API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: any; token: string }>('/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiClient.post<{ user: any; token: string }>('/auth/register', userData),
  
  logout: () => apiClient.post('/auth/logout'),
  
  refreshToken: () => apiClient.post<{ token: string }>('/auth/refresh'),
  
  getProfile: () => apiClient.get<any>('/auth/profile'),
  
  updateProfile: (userData: any) => apiClient.put<any>('/auth/profile', userData),
};

// Flight API functions
export const flightApi = {
  search: (params: any) => apiClient.get<any[]>('/flights/search', params),
  
  getById: (id: string) => apiClient.get<any>(`/flights/${id}`),
  
  getPopular: () => apiClient.get<any[]>('/flights/popular'),
  
  getDeals: () => apiClient.get<any[]>('/flights/deals'),
};

// Hotel API functions
export const hotelApi = {
  search: (params: any) => apiClient.get<any[]>('/hotels/search', params),
  
  getById: (id: string) => apiClient.get<any>(`/hotels/${id}`),
  
  getPopular: () => apiClient.get<any[]>('/hotels/popular'),
  
  getDeals: () => apiClient.get<any[]>('/hotels/deals'),
  
  getAmenities: () => apiClient.get<string[]>('/hotels/amenities'),
};

// Car API functions
export const carApi = {
  search: (params: any) => apiClient.get<any[]>('/cars/search', params),
  
  getById: (id: string) => apiClient.get<any>(`/cars/${id}`),
  
  getAvailable: (params: any) => apiClient.get<any[]>('/cars/available', params),
  
  getTypes: () => apiClient.get<string[]>('/cars/types'),
};

// Booking API functions
export const bookingApi = {
  create: (bookingData: any) => apiClient.post<any>('/bookings', bookingData),
  
  getByUser: (userId: string) => apiClient.get<any[]>(`/bookings/user/${userId}`),
  
  getById: (id: string) => apiClient.get<any>(`/bookings/${id}`),
  
  update: (id: string, bookingData: any) => apiClient.put<any>(`/bookings/${id}`, bookingData),
  
  cancel: (id: string) => apiClient.put<any>(`/bookings/${id}/cancel`),
  
  getHistory: (userId: string) => apiClient.get<any[]>(`/bookings/history/${userId}`),
};

// Payment API functions
export const paymentApi = {
  createPayment: (paymentData: any) => apiClient.post<any>('/payments', paymentData),
  
  confirmPayment: (paymentId: string) => apiClient.post<any>(`/payments/${paymentId}/confirm`),
  
  getPaymentStatus: (paymentId: string) => apiClient.get<any>(`/payments/${paymentId}`),
  
  refund: (paymentId: string, refundData: any) => apiClient.post<any>(`/payments/${paymentId}/refund`, refundData),
};