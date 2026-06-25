// Shared categories – replace with API when available
export interface CategoryItem {
  id: string;
  name: string;
  productCount?: number;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "mix", name: "Cмесь", productCount: 12 },
  { id: "kasha", name: "Каша", productCount: 8 },
  { id: "pechenye", name: "Печенье", productCount: 5 },
  { id: "sok", name: "Сок", productCount: 6 },
  { id: "pyure", name: "Пюре", productCount: 4 },
  { id: "chay", name: "Чай", productCount: 3 },
  { id: "suv", name: "Сув", productCount: 2 },
  { id: "zakuski", name: "Закуски", productCount: 7 },
  { id: "moy", name: "Мой", productCount: 1 },
  { id: "vitamin", name: "Витаминлар", productCount: 9 },
];
