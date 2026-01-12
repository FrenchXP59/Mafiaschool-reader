import React from "react";

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const BackgroundLayout = ({ children }: BackgroundLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: "url(/backgroundmafia.webp)",
        }}
      >
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Contenu */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default BackgroundLayout;