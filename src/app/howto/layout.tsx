import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Guide — RareImagery",
  description:
    "Everything you need to know about setting up and running your RareImagery store.",
};

export default function HowToLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
