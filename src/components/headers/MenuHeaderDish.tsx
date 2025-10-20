"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import GlassSurface from "@/components/UI/GlassSurface";

export default function MenuHeaderDish() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="container mx-auto px-5 pt-5 z-10">
      <div className="relative flex items-center justify-between z-10">
        {/* Back */}
        <div className="flex items-center z-10">
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
      </div>
    </header>
  );
}
