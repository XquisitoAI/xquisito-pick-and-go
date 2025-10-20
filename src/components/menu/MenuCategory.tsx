import MenuItem from "./MenuItem";
import { MenuSection } from "../../interfaces/category";

interface MenuCategoryProps {
  section: MenuSection;
}

export default function MenuCategory({ section }: MenuCategoryProps) {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
        {section.items && section.items.length > 0 ? (
          section.items.map((item) => <MenuItem key={item.id} item={item} />)
        ) : (
          <div className="col-span-full text-center py-4">
            <p className="text-gray-500">No hay items en esta sección</p>
          </div>
        )}
      </div>
    </section>
  );
}
