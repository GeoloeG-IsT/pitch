import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask a Question | Zeee Pitch Zooo",
};

export default function QueryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
