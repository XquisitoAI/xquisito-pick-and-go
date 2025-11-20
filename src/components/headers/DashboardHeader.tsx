"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import GlassSurface from "@/components/UI/GlassSurface";
import { useTableNavigation } from "../../hooks/useTableNavigation";

export default function DashboardHeader() {
  const { navigateWithTable } = useTableNavigation();
  const router = useRouter();

  const handleBack = () => {
    navigateWithTable("/menu");
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <header className="container mx-auto px-5 pt-5 z-1">
      <div className="relative flex items-center justify-between z-1">
        {/* Back Button */}
        <div className="flex items-center z-1">
          <GlassSurface
            width={40}
            height={40}
            borderRadius={50}
            blur={1}
            backgroundOpacity={0.85}
          >
            <div
              onClick={handleBack}
              className="size-10 rounded-full flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="text-primary" />
            </div>
          </GlassSurface>
        </div>

        {/* Xquisito Logo */}
        <div
          onClick={handleLogoClick}
          className="absolute left-1/2 transform -translate-x-1/2 size-10 cursor-pointer"
        >
          <img src="/logos/logo-short-green.webp" alt="Xquisito Logo" />
        </div>
      </div>
    </header>
  );
}
