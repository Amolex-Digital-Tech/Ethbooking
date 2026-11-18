export type JsonObject = Record<string, unknown>;

export type ApiJsonResponse<TData = unknown, TPhoto = unknown> = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: TData;
  redirectTo?: string;
  checkoutUrl?: string;
  photos?: TPhoto[];
  [key: string]: unknown;
};

export async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  const value: unknown = await request.json();

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonObject;
}

export async function readJsonResponse<TData = unknown, TPhoto = unknown>(
  response: Response,
): Promise<ApiJsonResponse<TData, TPhoto>> {
  const value: unknown = await response.json();

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as ApiJsonResponse<TData, TPhoto>;
}
