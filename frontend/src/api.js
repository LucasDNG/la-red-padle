import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  "/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) => {
    if (
      response.config?.url ===
        "/auth/register" &&
      response.status === 201
    ) {
      localStorage.setItem(
        "justRegistered",
        "1"
      );
    }

    return response;
  },
  (error) =>
    Promise.reject(error)
);
