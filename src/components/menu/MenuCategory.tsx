import MenuItem from "./MenuItem";
import { MenuSection } from "../../interfaces/category";

interface MenuCategoryProps {
  section: MenuSection;
}

export default function MenuCategory({ section }: MenuCategoryProps) {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 md:gap-x-8 lg:gap-x-10">
        {section.items && section.items.length > 0 ? (
          section.items.map((item) => <MenuItem key={item.id} item={item} />)
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
