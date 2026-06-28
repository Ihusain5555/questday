import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuestDay — calm, private desktop deep-work around the five daily prayers",
  description:
    "QuestDay turns your day into clear quests and deep-work blocks that flow with your salah — quietly, on your desktop, with everything kept on your device. Free forever, 100% offline, no account, no cloud.",
  openGraph: {
    title: "QuestDay — calm, private desktop deep-work around the five daily prayers",
    description:
      "QuestDay turns your day into clear quests and deep-work blocks that flow with your salah — quietly, on your desktop, with everything kept on your device. Free forever, 100% offline, no account, no cloud.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
