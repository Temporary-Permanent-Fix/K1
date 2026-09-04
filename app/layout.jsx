import "./globals.css";
export const metadata = { title: "K1_OMEGA", description: "Process & test tracker" };
export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
