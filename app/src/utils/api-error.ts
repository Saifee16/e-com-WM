interface ApiErrorBody {
  error?: {
    message?: string;
  };
  message?: string;
}

interface ApiErrorLike {
  response?: {
    data?: ApiErrorBody;
  };
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiErrorLike;

  return apiError.response?.data?.error?.message ?? apiError.response?.data?.message ?? (error instanceof Error ? error.message : fallback);
};
