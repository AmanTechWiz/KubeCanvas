import { EditorLayout } from "@/components/editor/editor-layout";

export default function EditorRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <EditorLayout>{children}</EditorLayout>;
}
