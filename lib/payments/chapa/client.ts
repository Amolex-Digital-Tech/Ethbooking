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

// Chapa's error responses carry the reason in `message`, either as text or as
// field validation errors such as { "email": ["validation.email"] }.
export function describeChapaError(responseData: unknown): string {
  const message =
    responseData && typeof responseData === "object"
      ? (responseData as { message?: unknown }).message
      : responseData;

  let text = "";
  if (typeof message === "string") {
    text = message;
  } else if (message && typeof message === "object") {
    text = Object.entries(message)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join("; ");
  }
  if (!text && responseData !== undefined) {
    try {
      text = JSON.stringify(responseData);
    } catch {
      text = String(responseData);
    }
  }

  return (text || "Chapa returned no error message.").slice(0, 500);
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
