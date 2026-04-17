import { useState } from "react";
import MenuItem from "./MenuItem";
import { MenuSection } from "../../interfaces/category";
import RestaurantClosedModal from "../RestaurantClosedModal";
import { useRestaurant } from "../../context/RestaurantContext";

interface MenuCategoryProps {
  section: MenuSection;
  showSectionName?: boolean;
}

export default function MenuCategory({
  section,
  showSectionName = false,
}: MenuCategoryProps) {
  const { restaurant } = useRestaurant();
  const [showClosedModal, setShowClosedModal] = useState(false);

  return (
    <section
      className="w-full mb-4 md:mb-5"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
    >
      <RestaurantClosedModal
        isOpen={showClosedModal}
        onClose={() => setShowClosedModal(false)}
        openingHours={restaurant?.opening_hours}
        restaurantName={restaurant?.name}
        restaurantLogo={restaurant?.logo_url}
      />
      {showSectionName && section.name && (
        <h2 className="text-black text-xl md:text-2xl lg:text-3xl font-medium">
          {section.name}
        </h2>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 md:gap-x-8 lg:gap-x-10">
        {section.items && section.items.length > 0 ? (
          section.items.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              onRestaurantClosed={() => setShowClosedModal(true)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-4 md:py-6 lg:py-8">
            <p className="text-gray-500 text-base md:text-lg lg:text-xl">
              No hay items en esta sección
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
