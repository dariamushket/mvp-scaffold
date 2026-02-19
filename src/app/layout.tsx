import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MVP App",
  description: "Business assessment and coaching platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
