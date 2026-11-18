const CHAPA_API_URL = "https://api.chapa.co/v1";

export class ChapaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData: unknown
  ) {
    super(message);
    this.name = "ChapaApiError";
  }
}

function getChapaSecretKey() {
  const secretKey = process.env.CHAPA_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CHAPA_SECRET_KEY is not configured.");
  }

  return secretKey;
}

export async function chapaRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${CHAPA_API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getChapaSecretKey()}`,
        ...(options.headers ?? {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Chapa API request failed:", {
      status: response.status,
      path,
      data,
    });

    throw new ChapaApiError("Chapa API request failed.", response.status, data);
  }

  return data as T;
}
