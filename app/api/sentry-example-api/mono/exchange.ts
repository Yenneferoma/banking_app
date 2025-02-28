import { saveBankToken } from "@/lib/actions/bank.actions";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { code, user } = req.body;

    // Exchange code for access token
    const monoSecretKey = process.env.MONO_SECRET_KEY;
    if (!monoSecretKey) {
      throw new Error("Mono secret key is not defined");
    }

    const response = await fetch("https://api.withmono.com/account/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mono-sec-key": monoSecretKey,
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();
    if (!data.token) throw new Error("Failed to exchange code");

    // Save token in your database
    const userId = user.id;
    const bankToken = data.token;
    await saveBankToken({ userId, bankToken });

    res.status(200).json({ success: true, token: data.token });
  } catch (error) {
    console.error("Mono Exchange Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ success: false, message: errorMessage });
  }
}
