"use client";

import { Restaurant } from "../../interfaces/restaurant";
import { useTable } from "../../context/TableContext";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import GlassSurface from "../UI/GlassSurface";

interface MenuHeaderProps {
  restaurant: Restaurant;
  tableNumber?: string;
}

export default function MenuHeader({
  restaurant,
  tableNumber,
}: MenuHeaderProps) {
  const { state } = useTable();
  const { navigateWithTable } = useTableNavigation();
  const pathname = usePathname();

  const handleCartClick = () => {
    navigateWithTable("/cart");
  };

  return (
    <header className="sticky top-0 container mx-auto px-5 pt-5 z-5">
      <div className="flex items-center justify-end z-10">
        <div className="flex items-center space-x-2 z-10">
          <div className="relative group" id="cart-icon">
            <div className="hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer rounded-full">
              <GlassSurface
                width={40}
                height={40}
                borderRadius={50}
                blur={1}
                backgroundOpacity={0.85}
              >
                <div
                  onClick={handleCartClick}
                  className="size-10 rounded-full flex items-center justify-center"
                >
                  <ShoppingCart className="text-primary size-5 group-hover:scale-105 transition-transform" />
                </div>
              </GlassSurface>
            </div>
            {state.currentUserTotalItems > 0 && (
              <div
                id="cart-badge"
                className="absolute -top-1 -right-1 bg-[#eab3f4] text-white rounded-full size-4 flex items-center justify-center text-xs font-normal"
              >
                {state.currentUserTotalItems}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
