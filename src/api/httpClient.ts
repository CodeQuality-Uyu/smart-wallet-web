import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { appConfig } from "@/app/config";
import { getToken } from "./tokenProvider";

export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: appConfig.apiBaseUrl,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10_000,
  });

  // Request interceptor — attach auth token if present (async to support token refresh)
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor — normalize errors
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<ApiError>) => {
      const apiError: ApiError = {
        message: error.response?.data?.message ?? error.message,
        statusCode: error.response?.status ?? 0,
        details: error.response?.data?.details,
      };
      return Promise.reject(apiError);
    },
  );

  return client;
};

export const httpClient = createHttpClient();
