import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { useTokenStore } from "../modules/auth/useTokenStore";
import { API_BASEURL, REFRESH_EXCLUDE_LIST } from "./constants";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASEURL,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true,
});


axiosInstance.interceptors.request.use(
  (config) => {
    const { authToken } = useTokenStore.getState();

    if (authToken) {
      config.headers = {
        ...config.headers,
        Authorization: authToken,
      };
    }

    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message: string }>) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } =
      error.config;

    // Exclude login page from triggering refresh token flow
    if (originalRequest.url && REFRESH_EXCLUDE_LIST.includes(originalRequest.url)) {
      if (error.response && error.response.data.message) {
        return Promise.reject(error.response.data);
      }
      return Promise.reject(error);
    }

    if (error.response) {
      // Access token expired
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { refreshToken } = useTokenStore.getState();

          return await axios.post(`${API_BASEURL}/auth/refresh`, {}, {
            headers: {
              Authorization: refreshToken
            }
          }).then(res => {
            let data = res.data;

            useTokenStore.getState().setTokens({
              authToken: data.data.authToken,
              refreshToken: data.data.refreshToken
            });

            console.log("Successfully refrested tokens.");
            setAxiosHeader(data.data.authToken);
            return axiosInstance(originalRequest);
          }).catch((err) => {
            // Failure to refresh tokens...
          });


        } catch (_error: any) {
          // Refresh was retried, but failed — we clear tokens and move on
          useTokenStore.getState().setTokens({
            authToken: "",
            refreshToken: "",
          });

          if (_error.response && _error.response.data.message) return Promise.reject(_error.response.data);
          return Promise.reject(_error);
        }
      }

      // Refresh was retried, but failed — we clear tokens and move on
      if (error.response.status === 401) {
        useTokenStore.getState().setTokens({
          authToken: "",
          refreshToken: "",
        });

        if (error.response.data.message) return Promise.reject(error.response.data);
      }
      return Promise.reject(error);
    }
  }
);

export default axiosInstance;

export const setAxiosHeader = (authToken: string) => {
  axiosInstance.defaults.headers.common.Authorization = authToken;
};
