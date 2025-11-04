import { AxiosError } from "axios";

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export type ApiErrorType = AxiosError<ApiErrorResponse>;
