import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/actions/user.actions";
export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();
    const result = await verifyEmail({ email, token });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Email verification API error:", error);

    // Ensure error is of type 'Error' before accessing message
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json({ message: errorMessage }, { status: 400 });
  }
}
