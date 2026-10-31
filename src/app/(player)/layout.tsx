export default function PlayerLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="contenu" className="min-h-dvh bg-black">
      {children}
    </main>
  );
}
