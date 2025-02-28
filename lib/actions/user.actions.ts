"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";

import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { sendVerificationEmail } from "@/components/EmailService";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: { userId: string }) => {
  try {
    const { database } = await createAdminClient();
    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    if (!user.documents.length) return null; // Prevents crashing if no user is found
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    const user = await getUserInfo({ userId: session.userId });

    if (!user?.isVerified) {
      throw new Error(
        "Email not verified. Please check your email for the verification code."
      );
    }

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(user);
  } catch (error) {
    console.error("Error signing in:", error);

    // Type assertion to extract the error message safely
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Sign-in failed. Please try again.";

    throw new Error(errorMessage);
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    const { account, database } = await createAdminClient();

    const newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) throw new Error("Error creating user account");

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });

    if (!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer");

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    // Generate a 6-digit verification token
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
        verificationToken,
        isVerified: false,
      }
    );

    //Send the verification token to the user's email
    await sendVerificationEmail(email, verificationToken);

    return {
      newUser,
      message: "Verification email sent. Please verify before login.",
    };
  } catch (error) {
    console.error("Error signing up:", error);
    throw new Error("Sign-up failed. Please try again.");
  }
};

export const verifyEmail = async ({
  email,
  token,
}: {
  email: string;
  token: string;
}) => {
  try {
    const { database } = await createAdminClient();

    // Find the user by email
    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", email)]
    );

    if (!users.documents.length) throw new Error("User not found");

    const user = users.documents[0];
    console.log("User document:", user);

    if (user.verificationToken !== token) {
      throw new Error("Invalid verification code");
    }

    // Update user to mark as verified
    await database.updateDocument(DATABASE_ID!, USER_COLLECTION_ID!, user.$id, {
      isVerified: true,
      verificationToken: "", // Clear the token after successful verification
    });

    return { message: "Email verified successfully. You can now log in." };
  } catch (error) {
    console.error("Error verifying email:", error);
    throw new Error(
      error instanceof Error ? error.message : "Email verification failed."
    );
  }
};

export const resendVerificationCode = async (email: string) => {
  try {
    const { database } = await createAdminClient();

    // Generate a new verification code
    const newToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Find user and update the verification token
    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", email)]
    );

    if (!users.documents.length) throw new Error("User not found");

    const user = users.documents[0];

    await database.updateDocument(DATABASE_ID!, USER_COLLECTION_ID!, user.$id, {
      verificationToken: newToken,
    });

    // Resend verification email
    await sendVerificationEmail(email, newToken);

    return { message: "Verification code resent successfully." };
  } catch (error) {
    console.error("Error resending verification code:", error);
    throw new Error("Failed to resend verification code. Try again later.");
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();

    const user = await getUserInfo({ userId: result.$id });
    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    (await cookies()).delete("appwrite-session");
    await account.deleteSession("current");
  } catch (error) {
    return null;
  }
};
export const createLinkToken = async (user: any) => {
  try {
    const userId = user?.newUser?.$id || user?.$id;
    if (!userId) throw new Error("Invalid user ID");

    const clientName =
      user?.newUser?.firstName && user?.newUser?.lastName
        ? `${user.newUser.firstName} ${user.newUser.lastName}`
        : "User";

    const tokenParams = {
      user: { client_user_id: userId },
      client_name: clientName,
      products: ["auth", "transactions"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return { linkToken: response.data.link_token };
  } catch (error: any) {
    console.error("Error creating link token:", error.response?.data || error);
    throw new Error("Failed to create Plaid link token.");
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();
    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    );

    return parseStringify(bankAccount);
  } catch (error) {
    console.error("Error creating bank account:", error);
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(
      request
    );
    const processorToken = processorTokenResponse.data.processor_token;

    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    if (!fundingSourceUrl) throw Error("Error creating funding source");

    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    revalidatePath("/");
    return parseStringify({ publicTokenExchange: "complete" });
  } catch (error) {
    console.error("An error occurred while exchanging public token:", error);
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();
    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );
    return parseStringify(banks.documents);
  } catch (error) {
    console.log(error);
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();
    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("$id", [documentId])]
    );
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error);
  }
};

export const getBankByAccountId = async ({
  accountId,
}: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();
    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("accountId", [accountId])]
    );

    if (bank.total !== 1) return null;
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error);
  }
};
