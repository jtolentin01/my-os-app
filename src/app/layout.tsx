import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/platform/theme/theme-provider"
import { ACCENT_STORAGE_KEY, DEFAULT_ACCENT } from "@/platform/theme/accents"
import { RegisterServiceWorker } from "@/platform/pwa/register-service-worker"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  applicationName: "My OS",
  title: {
    default: "My OS",
    template: "%s · My OS",
  },
  description: "Your life. Your system.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My OS",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-accent="teal"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=${JSON.stringify(ACCENT_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_ACCENT)};var allowed=["neutral","teal","blue","amber","rose"];var a=localStorage.getItem(k);document.documentElement.dataset.accent=(a&&allowed.indexOf(a)>=0)?a:d;}catch(e){document.documentElement.dataset.accent=${JSON.stringify(DEFAULT_ACCENT)};}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
