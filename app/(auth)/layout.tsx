import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen w-full justify-between font-inter">
      {children}
      <div className="auth-asset absolute -inset-x-16 right-0">
        <Image
          src="/icons/auth-imagev2.png"
          alt="Auth image"
          width={500}
          height={500}
        />
      </div>
    </main>
  );
}
