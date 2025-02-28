import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite"; // Import your Appwrite admin client setup

export async function POST(req: Request) {
  try {
    const { code, email } = await req.json(); // Get the code and email from the request

    if (!code || !email) {
      return NextResponse.json(
        { success: false, message: "Missing verification code or email." },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();
    const database = adminClient.database;

    // Fetch the user from Appwrite database
    const usersCollectionId =
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!;
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE!;

    const userRecords = await database.listDocuments(
      databaseId,
      usersCollectionId,
      [`email="${email}"`] // Use string-based filter
    );

    if (userRecords.documents.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const user = userRecords.documents[0];

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, message: "User already verified." },
        { status: 400 }
      );
    }

    if (user.verificationToken !== code) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code." },
        { status: 400 }
      );
    }

    // Update the user record to mark as verified
    await database.updateDocument(databaseId, usersCollectionId, user.$id, {
      isVerified: true,
      verificationToken: null, // Clear the token after verification
    });

    return NextResponse.json({
      success: true,
      message: "Verification successful!",
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
