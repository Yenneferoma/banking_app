"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const VerificationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || localStorage.getItem("userEmail");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);

  // Countdown Timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle Code Input
  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // Allow only numbers
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input if typing
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every((digit) => digit !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  // Handle Verification
  const handleVerify = async (enteredCode: string) => {
    setIsVerifying(true);
    setError("");
    try {
      await axios.post("/api/verify-code", { email, code: enteredCode });
      router.push("/"); // Redirect after successful verification
    } catch (error) {
      setError("Invalid code. Please try again.");
      setCode(["", "", "", "", "", ""]); // Reset input
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend Code
  const handleResend = async () => {
    setIsResending(true);
    setError("");
    try {
      await axios.post("/api/send-verification", { email });
      setTimer(60); // Reset timer
    } catch (error) {
      setError("Failed to resend. Try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="verification-form">
      <h1 className="text-24 lg:text-36 font-semibold text-gray-900 text-center">
        Verify Your Email
      </h1>
      <p className="text-16 text-gray-600 text-center">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
      </p>

      <div className="flex justify-center gap-2 my-4">
        {code.map((digit, index) => (
          <Input
            key={index}
            id={`code-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            className="w-12 h-12 text-center text-lg border rounded-md"
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-center">{error}</p>}

      <Button
        onClick={() => handleVerify(code.join(""))}
        disabled={isVerifying || code.includes("")}
        className="w-full mt-4"
      >
        {isVerifying ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          "Verify"
        )}
      </Button>

      <div className="flex flex-col items-center mt-4">
        <p className="text-gray-600">Didn't receive the code?</p>
        <Button
          variant="link"
          onClick={handleResend}
          disabled={isResending || timer > 0}
        >
          {isResending
            ? "Resending..."
            : timer > 0
            ? `Resend in ${timer}s`
            : "Resend Code"}
        </Button>
      </div>
    </section>
  );
};

export default VerificationPage;
