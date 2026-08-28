import axios from "axios";
import { toast } from "sonner";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 429) {
      const detail = error.response.data?.detail || "Rate limit reached. Please wait a minute.";
      toast.error(detail);
    }
    return Promise.reject(error);
  },
);
