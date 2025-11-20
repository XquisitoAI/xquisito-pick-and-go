"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function MenuHeaderBack() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="container mx-auto px-5 pt-5 z-10">
      <div className="relative flex items-center justify-between z-10">
        {/* Back */}
        <div className="flex items-center z-10">
          <div
            onClick={handleBack}
            className="size-10 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="text-primary" />
          </div>
        </div>

        {/* Xquisito Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 size-10">
          <img src="/logos/logo-short-green.webp" alt="Xquisito Logo" />
        </div>

        {/* User avatar (simplified for Pick & Go) */}
        {/* {isLoaded && user && (
          <div className="flex items-center space-x-2">
            <div className="size-10 rounded-full overflow-hidden border border-gray-300 shadow-sm">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || user.firstName || "Usuario"}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="size-10 bg-gradient-to-r from-[#34808C] to-[#173E44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {(user.fullName || user.firstName || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )} */}
      </div>
    </header>
  );
}