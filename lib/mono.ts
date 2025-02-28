const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY!;
const MONO_BASE_URL = "https://api.withmono.com";

/**
 * Exchange the Mono auth code for an access token
 */
export const exchangeMonoCodeForToken = async (code: string) => {
  const response = await fetch(`${MONO_BASE_URL}/account/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mono-sec-key": MONO_SECRET_KEY,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Mono auth code");
  }

  return response.json(); // Returns { token }
};

/**
 * Get account details from Mono
 */
export const getMonoAccount = async (accessToken: string) => {
  const response = await fetch(`${MONO_BASE_URL}/accounts/${accessToken}`, {
    headers: { "mono-sec-key": MONO_SECRET_KEY },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Mono account");
  }

  return response.json();
};

/**
 * Get transactions from Mono
 */
export const getMonoTransactions = async (accessToken: string) => {
  const response = await fetch(
    `${MONO_BASE_URL}/accounts/${accessToken}/transactions`,
    {
      headers: { "mono-sec-key": MONO_SECRET_KEY },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Mono transactions");
  }

  return response.json();
};
