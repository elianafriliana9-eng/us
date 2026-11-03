export default function BestieRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-bestie min-h-dvh w-full bg-[#F6F7F3] text-[#141619]">
      {children}
    </div>
  );
}
