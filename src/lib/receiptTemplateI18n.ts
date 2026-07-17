import type { Locale } from "@/i18n/config";

// Self-contained translations for the receipt-template feature (settings UI,
// field labels, and the printed receipt's own labels). Kept here rather than in
// the shared message JSON so the whole feature's strings live in one place.

export interface ReceiptOutLabels {
  saleNumber: string;
  date: string;
  time: string;
  seller: string;
  cashier: string;
  customer: string;
  contacts: string;
  customerPhone: string;
  comment: string;
  inn: string;
  legalName: string;
  address: string;
  products: string;
  discount: string;
  subtotal: string;
  total: string;
  balance: string;
  debt: string;
  poweredBy: string;
  thankYou: string;
  defaultStoreName: string;
}

export interface ReceiptTplStrings {
  title: string;
  description: string;
  testPrint: string;
  save: string;
  saving: string;
  loading: string;
  newReceipt: string;
  notSaved: string;
  defaultBadge: string;
  allRegisters: string;
  waybill: string;
  width: string;
  mm: string;
  name: string;
  namePlaceholder: string;
  printType: string;
  typeReceipt: string;
  register: string;
  registerDefault: string;
  makeDefault: string;
  logo: string;
  uploadLogo: string;
  infoBlock: string;
  reorderHint: string;
  extra: string;
  productAttributes: string;
  customerBalance: string;
  customerDebt: string;
  extraImage: string;
  uploadExtraImage: string;
  footerBlock: string;
  note: string;
  notePlaceholder: string;
  poweredByToggle: string;
  toasts: {
    enterName: string;
    saved: string;
    saveFailed: string;
    cantDeleteDefault: string;
    confirmDelete: string; // uses {name}
    deleted: string;
    deleteFailed: string;
    loadError: string;
  };
  imageUpload: {
    onlyJpgPng: string;
    tooLarge: string;
    replace: string;
    remove: string;
  };
  infoFields: Record<string, string>;
  footerLinks: Record<string, string>;
  out: ReceiptOutLabels;
}

const en: ReceiptTplStrings = {
  title: "Receipts",
  description: "Configure receipt templates and printing",
  testPrint: "Print (test)",
  save: "Save",
  saving: "...",
  loading: "Loading…",
  newReceipt: "New receipt",
  notSaved: "Not saved",
  defaultBadge: "Default",
  allRegisters: "All registers",
  waybill: "Waybill",
  width: "Width",
  mm: "mm",
  name: "Template name",
  namePlaceholder: "e.g. Standard",
  printType: "Print type",
  typeReceipt: "Receipt",
  register: "Register",
  registerDefault: "Default (all registers)",
  makeDefault: "Default template",
  logo: "Logo",
  uploadLogo: "Upload logo",
  infoBlock: "Info block",
  reorderHint: "Drag fields to reorder and toggle the ones you need.",
  extra: "Additional",
  productAttributes: "Product attributes (variant/attribute)",
  customerBalance: "Customer balance",
  customerDebt: "Customer debt",
  extraImage: "Extra image",
  uploadExtraImage: "Upload image (promo/QR)",
  footerBlock: "Footer block",
  note: "Display text (note)",
  notePlaceholder: "Thank you for your purchase!",
  poweredByToggle: 'Print "powered by KPOS"',
  toasts: {
    enterName: "Enter a template name",
    saved: "Saved",
    saveFailed: "Failed to save",
    cantDeleteDefault: "Can't delete the default template",
    confirmDelete: 'Delete template "{name}"?',
    deleted: "Deleted",
    deleteFailed: "Failed to delete",
    loadError: "Failed to load",
  },
  imageUpload: {
    onlyJpgPng: "Only JPG or PNG",
    tooLarge: "File must be under 5MB",
    replace: "Replace",
    remove: "Delete",
  },
  infoFields: {
    storeName: "Store name",
    date: "Date",
    workTime: "Working hours",
    seller: "Seller",
    cashier: "Cashier",
    customer: "Customer",
    contacts: "Contacts",
    customerPhone: "Customer phone",
    saleComment: "Sale comment",
    inn: "TIN",
    legalName: "Legal name",
    address: "Address",
    productCount: "Product count",
    showProducts: "Show products",
    itemDiscounts: "Item discounts",
    itemSums: "Item sums",
    receiptDiscounts: "Receipt discounts",
    receiptSums: "Receipt sums",
  },
  footerLinks: {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    website: "Website",
    barcode: "Barcode",
  },
  out: {
    saleNumber: "Receipt #",
    date: "Date",
    time: "Time",
    seller: "Seller",
    cashier: "Cashier",
    customer: "Customer",
    contacts: "Contacts",
    customerPhone: "Customer phone",
    comment: "Comment",
    inn: "TIN",
    legalName: "Legal",
    address: "Address",
    products: "Items",
    discount: "Discount",
    subtotal: "Subtotal",
    total: "TOTAL",
    balance: "Customer balance",
    debt: "Customer debt",
    poweredBy: "Printed with KPOS",
    thankYou: "Thank you for your purchase!",
    defaultStoreName: "Store",
  },
};

const ru: ReceiptTplStrings = {
  title: "Чеки",
  description: "Настройте шаблоны чеков и печать",
  testPrint: "Печать (тест)",
  save: "Сохранить",
  saving: "...",
  loading: "Загрузка…",
  newReceipt: "Новый чек",
  notSaved: "Не сохранён",
  defaultBadge: "По умолчанию",
  allRegisters: "Все кассы",
  waybill: "Накладная",
  width: "Ширина",
  mm: "мм",
  name: "Название шаблона",
  namePlaceholder: "Например: Стандартный",
  printType: "Тип печати",
  typeReceipt: "Чек",
  register: "Касса",
  registerDefault: "Стандарт (все кассы)",
  makeDefault: "Стандартный шаблон (по умолчанию)",
  logo: "Логотип",
  uploadLogo: "Загрузите логотип",
  infoBlock: "Информационный блок",
  reorderHint: "Перетаскивайте поля, чтобы изменить порядок, и включайте нужные.",
  extra: "Дополнительно",
  productAttributes: "Характеристики товара (вариант/атрибут)",
  customerBalance: "Баланс клиента",
  customerDebt: "Долг клиента",
  extraImage: "Дополнительное изображение",
  uploadExtraImage: "Загрузите изображение (акция/QR)",
  footerBlock: "Нижний блок",
  note: "Текст для показа (примечание)",
  notePlaceholder: "Спасибо за вашу покупку!",
  poweredByToggle: "Печать «с помощью KPOS»",
  toasts: {
    enterName: "Введите название шаблона",
    saved: "Сохранено",
    saveFailed: "Не удалось сохранить",
    cantDeleteDefault: "Нельзя удалить шаблон по умолчанию",
    confirmDelete: "Удалить шаблон «{name}»?",
    deleted: "Удалено",
    deleteFailed: "Не удалось удалить",
    loadError: "Ошибка загрузки",
  },
  imageUpload: {
    onlyJpgPng: "Только JPG или PNG",
    tooLarge: "Размер файла не должен превышать 5МБ",
    replace: "Заменить",
    remove: "Удалить",
  },
  infoFields: {
    storeName: "Название магазина",
    date: "Дата",
    workTime: "Рабочее время",
    seller: "Продавец",
    cashier: "Кассир",
    customer: "Клиент",
    contacts: "Контакты",
    customerPhone: "Телефон клиента",
    saleComment: "Комментарий к продаже",
    inn: "ИНН",
    legalName: "Юридическое название",
    address: "Адрес",
    productCount: "Количество товаров",
    showProducts: "Показывать товары",
    itemDiscounts: "Поштучные скидки",
    itemSums: "Поштучные суммы",
    receiptDiscounts: "Скидки чека",
    receiptSums: "Суммы чека",
  },
  footerLinks: {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    website: "Сайт",
    barcode: "Штрих-код",
  },
  out: {
    saleNumber: "Чек №",
    date: "Дата",
    time: "Время",
    seller: "Продавец",
    cashier: "Кассир",
    customer: "Клиент",
    contacts: "Контакты",
    customerPhone: "Тел. клиента",
    comment: "Комментарий",
    inn: "ИНН",
    legalName: "Юр. лицо",
    address: "Адрес",
    products: "Товаров",
    discount: "Скидка",
    subtotal: "Промежуточный итог",
    total: "ИТОГО",
    balance: "Баланс клиента",
    debt: "Долг клиента",
    poweredBy: "Чек напечатан с помощью KPOS",
    thankYou: "Спасибо за вашу покупку!",
    defaultStoreName: "Магазин",
  },
};

const uz: ReceiptTplStrings = {
  title: "Cheklar",
  description: "Chek shablonlari va chop etishni sozlang",
  testPrint: "Chop etish (test)",
  save: "Saqlash",
  saving: "...",
  loading: "Yuklanmoqda…",
  newReceipt: "Yangi chek",
  notSaved: "Saqlanmagan",
  defaultBadge: "Standart",
  allRegisters: "Barcha kassalar",
  waybill: "Yuk xati",
  width: "Kenglik",
  mm: "mm",
  name: "Shablon nomi",
  namePlaceholder: "Masalan: Standart",
  printType: "Chop etish turi",
  typeReceipt: "Chek",
  register: "Kassa",
  registerDefault: "Standart (barcha kassalar)",
  makeDefault: "Standart shablon (birlamchi)",
  logo: "Logotip",
  uploadLogo: "Logotip yuklang",
  infoBlock: "Ma'lumot bloki",
  reorderHint: "Tartibni o'zgartirish uchun maydonlarni suring va keraklilarni yoqing.",
  extra: "Qo'shimcha",
  productAttributes: "Mahsulot xususiyatlari (variant/atribut)",
  customerBalance: "Mijoz balansi",
  customerDebt: "Mijoz qarzi",
  extraImage: "Qo'shimcha rasm",
  uploadExtraImage: "Rasm yuklang (aksiya/QR)",
  footerBlock: "Pastki blok",
  note: "Ko'rsatiladigan matn (izoh)",
  notePlaceholder: "Xaridingiz uchun rahmat!",
  poweredByToggle: "«KPOS yordamida» chop etish",
  toasts: {
    enterName: "Shablon nomini kiriting",
    saved: "Saqlandi",
    saveFailed: "Saqlab bo'lmadi",
    cantDeleteDefault: "Standart shablonni o'chirib bo'lmaydi",
    confirmDelete: "«{name}» shablonini o'chirasizmi?",
    deleted: "O'chirildi",
    deleteFailed: "O'chirib bo'lmadi",
    loadError: "Yuklashda xatolik",
  },
  imageUpload: {
    onlyJpgPng: "Faqat JPG yoki PNG",
    tooLarge: "Fayl hajmi 5MB dan oshmasligi kerak",
    replace: "Almashtirish",
    remove: "O'chirish",
  },
  infoFields: {
    storeName: "Do'kon nomi",
    date: "Sana",
    workTime: "Ish vaqti",
    seller: "Sotuvchi",
    cashier: "Kassir",
    customer: "Mijoz",
    contacts: "Kontaktlar",
    customerPhone: "Mijoz telefoni",
    saleComment: "Sotuv sharhi",
    inn: "INN",
    legalName: "Yuridik nomi",
    address: "Manzil",
    productCount: "Mahsulot soni",
    showProducts: "Tovarlarni ko'rsatish",
    itemDiscounts: "Dona chegirmalar",
    itemSums: "Dona summalar",
    receiptDiscounts: "Chek chegirmalari",
    receiptSums: "Chek summalari",
  },
  footerLinks: {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    website: "Sayt",
    barcode: "Shtrix-kod",
  },
  out: {
    saleNumber: "Chek №",
    date: "Sana",
    time: "Vaqt",
    seller: "Sotuvchi",
    cashier: "Kassir",
    customer: "Mijoz",
    contacts: "Kontaktlar",
    customerPhone: "Mijoz tel.",
    comment: "Izoh",
    inn: "INN",
    legalName: "Yur. nomi",
    address: "Manzil",
    products: "Mahsulotlar",
    discount: "Chegirma",
    subtotal: "Oraliq jami",
    total: "JAMI",
    balance: "Mijoz balansi",
    debt: "Mijoz qarzi",
    poweredBy: "Chek KPOS yordamida chop etildi",
    thankYou: "Xaridingiz uchun rahmat!",
    defaultStoreName: "Do'kon",
  },
};

const uzc: ReceiptTplStrings = {
  title: "Чеклар",
  description: "Чек шаблонлари ва чоп этишни созланг",
  testPrint: "Чоп этиш (тест)",
  save: "Сақлаш",
  saving: "...",
  loading: "Юкланмоқда…",
  newReceipt: "Янги чек",
  notSaved: "Сақланмаган",
  defaultBadge: "Стандарт",
  allRegisters: "Барча кассалар",
  waybill: "Юк хати",
  width: "Кенглик",
  mm: "мм",
  name: "Шаблон номи",
  namePlaceholder: "Масалан: Стандарт",
  printType: "Чоп этиш тури",
  typeReceipt: "Чек",
  register: "Касса",
  registerDefault: "Стандарт (барча кассалар)",
  makeDefault: "Стандарт шаблон (бирламчи)",
  logo: "Логотип",
  uploadLogo: "Логотип юкланг",
  infoBlock: "Маълумот блоки",
  reorderHint: "Тартибни ўзгартириш учун майдонларни суринг ва кераклиларни ёқинг.",
  extra: "Қўшимча",
  productAttributes: "Маҳсулот хусусиятлари (вариант/атрибут)",
  customerBalance: "Мижоз баланси",
  customerDebt: "Мижоз қарзи",
  extraImage: "Қўшимча расм",
  uploadExtraImage: "Расм юкланг (акция/QR)",
  footerBlock: "Пастки блок",
  note: "Кўрсатиладиган матн (изоҳ)",
  notePlaceholder: "Харидингиз учун раҳмат!",
  poweredByToggle: "«KPOS ёрдамида» чоп этиш",
  toasts: {
    enterName: "Шаблон номини киритинг",
    saved: "Сақланди",
    saveFailed: "Сақлаб бўлмади",
    cantDeleteDefault: "Стандарт шаблонни ўчириб бўлмайди",
    confirmDelete: "«{name}» шаблонини ўчирасизми?",
    deleted: "Ўчирилди",
    deleteFailed: "Ўчириб бўлмади",
    loadError: "Юклашда хатолик",
  },
  imageUpload: {
    onlyJpgPng: "Фақат JPG ёки PNG",
    tooLarge: "Файл ҳажми 5MB дан ошмаслиги керак",
    replace: "Алмаштириш",
    remove: "Ўчириш",
  },
  infoFields: {
    storeName: "Дўкон номи",
    date: "Сана",
    workTime: "Иш вақти",
    seller: "Сотувчи",
    cashier: "Кассир",
    customer: "Мижоз",
    contacts: "Контактлар",
    customerPhone: "Мижоз телефони",
    saleComment: "Сотув шарҳи",
    inn: "ИНН",
    legalName: "Юридик номи",
    address: "Манзил",
    productCount: "Маҳсулот сони",
    showProducts: "Товарларни кўрсатиш",
    itemDiscounts: "Дона чегирмалар",
    itemSums: "Дона суммалар",
    receiptDiscounts: "Чек чегирмалари",
    receiptSums: "Чек суммалари",
  },
  footerLinks: {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    website: "Сайт",
    barcode: "Штрих-код",
  },
  out: {
    saleNumber: "Чек №",
    date: "Сана",
    time: "Вақт",
    seller: "Сотувчи",
    cashier: "Кассир",
    customer: "Мижоз",
    contacts: "Контактлар",
    customerPhone: "Мижоз тел.",
    comment: "Изоҳ",
    inn: "ИНН",
    legalName: "Юр. номи",
    address: "Манзил",
    products: "Маҳсулотлар",
    discount: "Чегирма",
    subtotal: "Оралиқ жами",
    total: "ЖАМИ",
    balance: "Мижоз баланси",
    debt: "Мижоз қарзи",
    poweredBy: "Чек KPOS ёрдамида чоп этилди",
    thankYou: "Харидингиз учун раҳмат!",
    defaultStoreName: "Дўкон",
  },
};

const DICT: Record<Locale, ReceiptTplStrings> = { en, ru, uz, uzc };

export function receiptTplStrings(locale: Locale): ReceiptTplStrings {
  return DICT[locale] ?? ru;
}
