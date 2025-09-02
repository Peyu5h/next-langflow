import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import ReactQueryProvider from "~/components/providers/ReactQueryProvider";
import { Toaster } from "~/components/ui/sonner";
import Navbar from "~/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | APP",
    default: "APP",
  },
  description: "Description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className + " antialiased"}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <div className="mx-auto flex max-w-3xl items-center justify-between py-4">
              <div className="w-full items-center">
                <Navbar />
              </div>
            </div>
            {children}
          </ReactQueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
