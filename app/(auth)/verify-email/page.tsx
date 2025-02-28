"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyEmail } from "@/lib/actions/user.actions";
import { Loader2 } from "lucide-react";

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (!email) {
        setError("Email not found. Please sign up again.");
        setIsLoading(false);
        return;
      }

      const response = await verifyEmail({ email, token: code });

      if (
        response?.message === "Email verified successfully. You can now log in."
      ) {
        router.push("/"); // ✅ Redirects to homepage after verification
      } else {
        setError(response?.message || "Invalid or expired verification code.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Verify Your Email</h1>
      <p className="text-gray-600 mb-6">
        Enter the verification code sent to {email}
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter code"
        className="mb-4 p-2 border rounded w-80 text-center"
      />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Button onClick={handleVerify} disabled={isLoading} className="w-80">
        {isLoading ? <Loader2 className="animate-spin" /> : "Verify"}
      </Button>
    </section>
  );
};

export default VerifyEmailPage;
