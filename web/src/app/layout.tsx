import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ErrorProvider } from "@/components/ErrorProvider";
import ThemePicker from "@/components/ThemePicker";

const themeInitScript = `
(function(){try{var t=localStorage.getItem('docforge-theme');var v=['forge','ocean','forest','royal','rose','mono'];if(t&&v.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','forge');}}catch(e){document.documentElement.setAttribute('data-theme','forge');}})();
`;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocForge",
  description: "Centralize, search, and manage your technical documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="forge" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <ErrorProvider>
            <ThemePicker />
            {children}
          </ErrorProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
