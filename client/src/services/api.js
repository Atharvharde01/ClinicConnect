import axios from "axios";

const backendRoot = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

const api = axios.create({
  baseURL: backendRoot ? `${backendRoot}/api` : "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT automatically
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!config.headers.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const getApiErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

export default api;
