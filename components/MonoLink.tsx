"use client";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { saveBankToken } from "@/lib/actions/bank.actions";

declare global {
  interface Window {
    MonoConnect: any;
  }
}

interface MonoLinkProps {
  user: {
    $id: string;
  };
}

const MonoLink: React.FC<MonoLinkProps> = ({ user }) => {
  const router = useRouter();

  const handleSuccess = async ({ code }: { code: string }) => {
    try {
      const response = await saveBankToken({
        userId: user.$id,
        bankToken: code,
      });
      console.log("Bank Token Saved:", response);
      router.refresh(); // Refresh to load new bank data
    } catch (error) {
      console.error("Error saving bank token:", error);
    }
  };

  useEffect(() => {
    if (window.MonoConnect) {
      const mono = new window.MonoConnect({
        key: process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY, // Ensure this is in your `.env`
        onSuccess: handleSuccess,
      });

      mono.setup();
    }
  }, []);

  return (
    <button onClick={() => window.MonoConnect.open()} className="btn-primary">
      Connect Your Bank with Mono
    </button>
  );
};

export default MonoLink;
