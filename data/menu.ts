/**
 * Al Naqer Village — menu data (single source of truth).
 * Edit prices / names here; every page and the search index update automatically.
 * All prices are in EGP and already include VAT (per the printed menu).
 */

export type L10n = { ar: string; en: string };
export type Price = { value: number | string; label?: L10n };
export type Item = {
  name: L10n;
  desc?: L10n;
  parts?: L10n[]; // ingredient chips (used by the trays)
  prices: Price[];
  badge?: L10n;
};
export type Section = { title?: L10n; items: Item[] };
export type Category = {
  id: string;
  icon: string;
  group: 'food' | 'drinks';
  layout: 'trays' | 'list';
  name: L10n;
  note?: L10n;
  sections: Section[];
};

/* ───────────── tiny helpers to keep the data readable ───────────── */
const L = (ar: string, en: string): L10n => ({ ar, en });
const P = (value: number | string, label?: [string, string]): Price =>
  label ? { value, label: L(label[0], label[1]) } : { value };
const item = (
  name: [string, string],
  prices: Price[],
  desc?: [string, string],
  extra: Partial<Item> = {},
): Item => ({
  name: L(...name),
  prices,
  ...(desc ? { desc: L(...desc) } : {}),
  ...extra,
});
const parts = (list: [string, string][]): L10n[] => list.map(([a, e]) => L(a, e));

const SIGNATURE = L('مميز', 'Signature');
const OFFER = L('عرض', 'Offer');

const MD: [string, string] = ['M', 'M'];
const LG: [string, string] = ['L', 'L'];
const THIRD: [string, string] = ['ثلث كيلو', '⅓ kg'];
const HALF: [string, string] = ['نصف كيلو', '½ kg'];

/* ───────────── FOOD ───────────── */

const trays: Category = {
  id: 'trays',
  icon: '🍽️',
  group: 'food',
  layout: 'trays',
  name: L('الصواني', 'Family Trays'),
  sections: [
    {
      items: [
        item(['صينية الوحوش', 'The Beasts Tray'], [P(1820)], undefined, {
          parts: parts([
            ['٦ أرباع فراخ مندي', '6 chicken quarters mandi'],
            ['½ ك ضاني مندي', '½ kg lamb mandi'],
            ['½ ك كفتة', '½ kg kofta'],
            ['ممبار', 'Mombar'],
            ['ورق عنب أو بطاطس', 'Vine leaves or potatoes'],
            ['سمبوسة', 'Sambousek'],
          ]),
        }),
        item(['صينية الملوك', 'The Kings Tray'], [P(2100)], undefined, {
          parts: parts([
            ['٨ قطع ضاني مكرونة', '8 lamb pieces with macaroni'],
            ['٢ موزة ضاني', '2 lamb shanks'],
          ]),
        }),
        item(['صينية الصحاب', 'The Friends Tray'], [P(1950)], undefined, {
          parts: parts([
            ['½ ك كفتة', '½ kg kofta'],
            ['½ ك ريش', '½ kg chops'],
            ['½ ك شيش طاووق', '½ kg shish tawook'],
            ['بطاطس', 'Potatoes'],
            ['٢ فرد حمام محشي', '2 stuffed pigeons'],
            ['سمبوسك', 'Sambousek'],
          ]),
        }),
        item(['صينية العيلة', 'The Family Tray'], [P(1465)], undefined, {
          parts: parts([
            ['½ ك ضاني مندي', '½ kg lamb mandi'],
            ['١ ك أرز بسمتي', '1 kg basmati rice'],
            ['½ ك كفتة', '½ kg kofta'],
            ['½ فرخة شيش', '½ shish chicken'],
            ['ممبار', 'Mombar'],
            ['ملوخية', 'Molokhia'],
          ]),
        }),
        item(['صينية الحبايب', 'The Loved Ones Tray'], [P(1570)], undefined, {
          parts: parts([
            ['٦ أرباع فراخ مندي', '6 chicken quarters mandi'],
            ['½ ك كفتة', '½ kg kofta'],
            ['ممبار', 'Mombar'],
            ['محاشي', 'Mahshi'],
            ['طرب', 'Tarb'],
          ]),
        }),
        item(['صينية مشاوي', 'Mixed Grill Tray'], [P(2440)], undefined, {
          parts: parts([
            ['١ ك كفتة', '1 kg kofta'],
            ['½ ك كباب', '½ kg kebab'],
            ['½ ك كبدة', '½ kg liver'],
            ['½ ك شيش طاووق', '½ kg shish tawook'],
            ['٤ حواوشي', '4 hawawshi'],
            ['ورق عنب', 'Vine leaves'],
          ]),
        }),
        item(['صينية العمدة', "The Mayor's Tray"], [P(2465)], undefined, {
          badge: SIGNATURE,
          parts: parts([
            ['١ ك ضاني مندي', '1 kg lamb mandi'],
            ['½ ك أرز بسمتي', '½ kg basmati rice'],
            ['½ ك كفتة', '½ kg kofta'],
            ['½ ك شيش طاووق', '½ kg shish tawook'],
            ['كبدة مشوي', 'Grilled liver'],
            ['ممبار', 'Mombar'],
          ]),
        }),
        item(['صينية الحرب العالمية', 'The World War Tray'], [P(3250)], undefined, {
          badge: SIGNATURE,
          parts: parts([
            ['١ ك ضاني مندي', '1 kg lamb mandi'],
            ['٥ فرد حمام', '5 pigeons'],
            ['½ ك كفتة', '½ kg kofta'],
            ['½ ك كبدة', '½ kg liver'],
            ['ممبار', 'Mombar'],
            ['محاشي', 'Mahshi'],
            ['٢ ملوخية', '2 molokhia'],
          ]),
        }),
      ],
    },
  ],
};

const mandi: Category = {
  id: 'mandi',
  icon: '🍚',
  group: 'food',
  layout: 'list',
  name: L('المندي', 'Mandi'),
  sections: [
    {
      items: [
        item(['نفر لحم مندي (ضاني)', 'Mandi Meat Portion (Lamb)'], [P(395)]),
        item(['نفر لحم مندي (كندوز)', 'Mandi Meat Portion (Kandouz beef)'], [P(365)]),
        item(['موزة ضاني مندي', 'Lamb Shank Mandi'], [P(520)]),
        item(['موزة بتلو مندي', 'Veal Shank Mandi'], [P(470)]),
        item(['ضلع مندي (ضاني)', 'Lamb Ribs Mandi'], [P(450)]),
        item(['وجبة دجاج مندي', 'Chicken Mandi Meal'], [P(210)]),
        item(['أرز مندي سادة', 'Plain Mandi Rice'], [P(75)]),
        item(['دقوس', 'Daqoos (tomato-chili sauce)'], [P(16)]),
      ],
    },
  ],
};

const grills: Category = {
  id: 'grills',
  icon: '🔥',
  group: 'food',
  layout: 'list',
  name: L('المشويات', 'Grills'),
  sections: [
    {
      title: L('بالوزن', 'By weight'),
      items: [
        item(['كباب (ضاني أو بتلو)', 'Kebab (Lamb or Veal)'], [P(395, THIRD), P(570, HALF)]),
        item(['ريش (ضاني أو بتلو)', 'Chops (Lamb or Veal)'], [P(440, THIRD), P(640, HALF)]),
        item(['فلتو', 'Fillet'], [P(375, THIRD), P(540, HALF)]),
        item(['شيش طاووق', 'Shish Tawook'], [P(215, THIRD), P(320, HALF)]),
        item(['طرب', 'Tarb'], [P(315, THIRD), P(450, HALF)]),
        item(['كفتة', 'Kofta'], [P(305, THIRD), P(430, HALF)]),
        item(['مشكل', 'Mixed'], [P(325, THIRD), P(470, HALF)]),
      ],
    },
    {
      title: L('أطباق مشوية', 'Grilled plates'),
      items: [
        item(['ميكس جريل', 'Mix Grill'], [P(1150)], undefined, { badge: SIGNATURE }),
        item(['موزة ضاني مشوية', 'Grilled Lamb Shank'], [P(480)]),
        item(['ضلع (ضاني أو بتلو)', 'Ribs (Lamb or Veal)'], [P(440)], ['٦٠٠ جم', '600 g']),
        item(['سجق مشوي', 'Grilled Sausage'], [P(255)]),
        item(['وجبة نصف فرخة مشوية', 'Half Grilled Chicken Meal'], [P(210)]),
      ],
    },
  ],
};

const meals: Category = {
  id: 'meals',
  icon: '🍱',
  group: 'food',
  layout: 'list',
  name: L('الوجبات', 'Meals'),
  sections: [
    {
      items: [
        item(
          ['وجبة الأطفال', 'Kids Meal'],
          [P(120, ['ورك', 'Thigh']), P(140, ['صدر', 'Breast'])],
          ['ربع دجاج مشوي - أرز بسمتي - بطاطس', 'Quarter grilled chicken, basmati rice, fries'],
        ),
        item(
          ['وجبة توفير', 'Saver Meal'],
          [P(190, ['ورك', 'Thigh']), P(220, ['صدر', 'Breast'])],
          ['ربع دجاج مشوي - ٢ قطعة كفتة - أرز بسمتي', 'Quarter grilled chicken, 2 kofta pieces, basmati rice'],
        ),
        item(
          ['وجبة كفتة مشوية', 'Grilled Kofta Meal'],
          [P(275)],
          ['كفتة - أرز بسمتي - سمبوسك - بطاطس', 'Kofta, basmati rice, sambousek, fries'],
        ),
        item(
          ['وجبة شيش طاووق', 'Shish Tawook Meal'],
          [P(265)],
          ['شيش طاووق دجاج - أرز بسمتي - بطاطس', 'Chicken shish tawook, basmati rice, fries'],
        ),
        item(
          ['وجبة الأكيل', 'Al Akeel Meal'],
          [P(490)],
          [
            'فرد حمام - ربع كفتة - ربع ستيك مشوي - ممبار - بطاطس - أرز بسمتي',
            'Stuffed pigeon, ¼ kofta, ¼ grilled steak, mombar, fries, basmati rice',
          ],
        ),
      ],
    },
  ],
};

const bedouin: Category = {
  id: 'bedouin',
  icon: '🏜️',
  group: 'food',
  layout: 'list',
  name: L('المأكولات البدوية', 'Bedouin Dishes'),
  sections: [
    {
      title: L('٥٥٠ جم', '550 g'),
      items: [
        item(
          ['ضاني', 'Lamb'],
          [P(530)],
          ['أرز أحمر أو مكرونة مبكبكة', 'Red rice or mabkabka pasta'],
        ),
        item(
          ['شمبري', 'Shambary'],
          [P(490)],
          ['أرز أحمر أو مكرونة مبكبكة', 'Red rice or mabkabka pasta'],
        ),
        item(
          ['ديك بلدي', 'Local Rooster (Deek Baladi)'],
          [P(470)],
          ['أرز أحمر أو مكرونة مبكبكة', 'Red rice or mabkabka pasta'],
        ),
      ],
    },
    {
      title: L('٦٠٠ جم', '600 g'),
      items: [
        item(
          ['كبدة ضاني', 'Lamb Liver'],
          [P(410)],
          ['بدوي أو اسكندراني', 'Bedouin or Alexandrian style'],
        ),
        item(
          ['موزة ضاني', 'Lamb Shank'],
          [P(530)],
          ['أرز أحمر أو مكرونة مبكبكة', 'Red rice or mabkabka pasta'],
        ),
      ],
    },
    {
      items: [
        item(['تحميرة', 'Tahmira'], [P(450)]),
        item(['طبق مبكبكة', 'Mabkabka Side'], [P(85)]),
      ],
    },
  ],
};

const oriental: Category = {
  id: 'oriental',
  icon: '🥘',
  group: 'food',
  layout: 'list',
  name: L('الشرقي', 'Oriental'),
  sections: [
    {
      items: [
        item(['موزة فتة (ضاني أو بتلو)', 'Shank Fatta (Lamb or Veal)'], [P(530)]),
        item(['ورقة لحمة', 'Meat Warqa'], [P(390)]),
        item(['فتة كوارع', 'Trotters Fatta'], [P(385)]),
        item(['طاجن سجق', 'Sausage Tagine'], [P(265)]),
        item(['ورقة سجق', 'Sausage Warqa'], [P(275)]),
        item(['فرد حمام محشي', 'Stuffed Pigeon'], [P(190)]),
        item(['طبق محاشي ورق عنب', 'Stuffed Vine Leaves Plate'], [P(95, MD), P(135, LG)]),
        item(['ممبار', 'Mombar (stuffed sausage)'], [P(95, MD), P(135, LG)]),
        item(['طبق محاشي مشكل', 'Mixed Mahshi Plate'], [P(95, MD), P(135, LG)]),
        item(['أرز أبيض', 'White Rice'], [P(55)]),
        item(['كبد وكلاوي', 'Liver & Kidneys'], [P(110)]),
        item(['سمبوسك (٨ قطع)', 'Sambousek (8 pcs)'], [P(75)]),
      ],
    },
  ],
};

const homestyle: Category = {
  id: 'homestyle',
  icon: '🍛',
  group: 'food',
  layout: 'list',
  name: L('الأطباق الشعبية', 'Home-Style Dishes'),
  sections: [
    {
      items: [
        item(
          ['ملوخية', 'Molokhia'],
          [P(60, ['سادة', 'Plain']), P(140, ['لحمة', 'With meat'])],
        ),
        item(['بامية', 'Okra'], [P(65)]),
        item(['بامية باللحمة', 'Okra with Meat'], [P(220)]),
        item(['خضار مشكل', 'Mixed Vegetables'], [P(65)]),
        item(['خضار مشكل باللحمة', 'Mixed Vegetables with Meat'], [P(220)]),
        item(['بطاطس', 'Potatoes'], [P(85)]),
        item(['بطاطس بالفراخ', 'Potatoes with Chicken'], [P(165)]),
        item(['بطاطس باللحم', 'Potatoes with Meat'], [P(280)]),
        item(['عكاوي', 'Okawi'], [P(380)]),
        item(['ورق عنب بالكوارع', 'Vine Leaves with Trotters'], [P(365)]),
        item(['البصلية باللحم الضاني', 'Lamb Onion Stew (Basaliya)'], [P(360)]),
        item(['مخاصي', 'Makhasi'], [P(330)]),
      ],
    },
  ],
};

const starters: Category = {
  id: 'starters',
  icon: '🥗',
  group: 'food',
  layout: 'list',
  name: L('المقبلات', 'Starters'),
  sections: [
    {
      items: [
        item(['سلطة خضراء', 'Green Salad'], [P(18)]),
        item(['تومية', 'Toum (garlic sauce)'], [P(28)]),
        item(['طحينة', 'Tahini'], [P(20)]),
        item(['بابا غنوج', 'Baba Ghanoush'], [P(20)]),
        item(['جبنة قديمة', 'Aged Cheese'], [P(16)]),
        item(['كولسلو', 'Coleslaw'], [P(28)]),
        item(['مسقعة', 'Moussaka'], [P(20)]),
        item(['سلطة بلدي كبير', 'Baladi Salad (large)'], [P(35)]),
        item(['بطاطس', 'French Fries'], [P(34)]),
        item(['سلطة زبادي', 'Yogurt Salad'], [P(28)]),
      ],
    },
  ],
};

const soups: Category = {
  id: 'soups',
  icon: '🍜',
  group: 'food',
  layout: 'list',
  name: L('الشوربة', 'Soups'),
  sections: [
    {
      items: [
        item(['مغربي', 'Moroccan Soup'], [P(45)]),
        item(['كريمة', 'Cream Soup'], [P(85)], ['مشروم أو فراخ', 'Mushroom or chicken']),
        item(['حمام', 'Pigeon Soup'], [P(85)]),
        item(['كوارع', 'Trotters Soup'], [P(145)]),
        item(['عكاوي', 'Okawi Soup'], [P(110)]),
      ],
    },
  ],
};

/* ───────────── DRINKS & DESSERTS ───────────── */

const coffee: Category = {
  id: 'coffee',
  icon: '☕',
  group: 'drinks',
  layout: 'list',
  name: L('القهوة', 'Coffee'),
  sections: [
    {
      title: L('اسبرسو', 'Espresso'),
      items: [
        item(
          ['اسبرسو', 'Espresso'],
          [P(40, ['سنجل', 'Single']), P(48, ['دبل', 'Double']), P(55, ['ميكاتو', 'Macchiato'])],
        ),
        item(['اسبانش لاتيه', 'Spanish Latte'], [P(80)]),
        item(['كابتشينو أو لاتيه', 'Cappuccino or Latte'], [P(76)]),
      ],
    },
    {
      title: L('موكا ونسكافيه', 'Mocha & Nescafé'),
      items: [
        item(['موكا', 'Mocha'], [P(74)]),
        item(['كراميل', 'Caramel'], [P(78)]),
        item(['نسكافيه', 'Nescafé'], [P(74)]),
        item(['نسكافيه بلاك', 'Nescafé Black'], [P(64)]),
      ],
    },
    {
      title: L('قهوة', 'Coffee'),
      items: [
        item(['تركي', 'Turkish Coffee'], [P(35)]),
        item(['تركي دبل', 'Double Turkish Coffee'], [P(45)]),
        item(['فرنساوي', 'French Coffee'], [P(50)]),
        item(['بندق', 'Hazelnut Coffee'], [P(54)]),
        item(['كرمل', 'Caramel Coffee'], [P(50)]),
      ],
    },
  ],
};

const hot: Category = {
  id: 'hot',
  icon: '🍵',
  group: 'drinks',
  layout: 'list',
  name: L('المشروبات الساخنة', 'Hot Drinks'),
  sections: [
    {
      title: L('الشاي', 'Tea'),
      items: [
        item(['شاي عادي', 'Classic Tea'], [P(30)]),
        item(['شاي أخضر', 'Green Tea'], [P(30)]),
        item(['شاي أخضر نعناع', 'Green Tea with Mint'], [P(30)]),
      ],
    },
    {
      title: L('أعشاب وأخرى', 'Herbal & more'),
      items: [
        item(
          ['نعناع - ينسون - كركديه - قرفة', 'Mint / Anise / Hibiscus / Cinnamon'],
          [P(25)],
        ),
        item(['كوكتيل أعشاب', 'Herbal Cocktail'], [P(46)]),
        item(['أميركان كوفي', 'American Coffee'], [P(48)]),
        item(['هوت الناقر', 'Hot Al Naqer'], [P(54)], undefined, { badge: SIGNATURE }),
      ],
    },
    {
      title: L('سحلب', 'Sahlab'),
      items: [
        item(['سحلب مكسرات', 'Sahlab with Nuts'], [P(72)]),
        item(['سحلب فواكه', 'Sahlab with Fruits'], [P(75)]),
      ],
    },
    {
      title: L('هوت', 'Hot'),
      items: [
        item(['هوت شوكلت', 'Hot Chocolate'], [P(75)]),
        item(['هوت سيدر', 'Hot Cider'], [P(75)]),
      ],
    },
  ],
};

const juices: Category = {
  id: 'juices',
  icon: '🍹',
  group: 'drinks',
  layout: 'list',
  name: L('العصائر', 'Fresh Juices'),
  sections: [
    {
      items: [
        item(['مانجو', 'Mango'], [P(85)]),
        item(['فراولة', 'Strawberry'], [P(80)]),
        item(['برتقال', 'Orange'], [P(75)]),
        item(['بطيخ', 'Watermelon'], [P(75)]),
        item(['جوافة', 'Guava'], [P(75)]),
        item(['ليمون', 'Lemon'], [P(50)]),
        item(['ليمون نعناع', 'Lemon Mint'], [P(60)]),
        item(['موز باللبن', 'Banana with Milk'], [P(85)]),
        item(['كيوي باللبن', 'Kiwi with Milk'], [P(95)]),
        item(['عناب ساقع', 'Iced Jujube (Unnab)'], [P(40)]),
      ],
    },
  ],
};

const cocktails: Category = {
  id: 'cocktails',
  icon: '🥤',
  group: 'drinks',
  layout: 'list',
  name: L('الكوكتيلات', 'Cocktails'),
  sections: [
    {
      items: [
        item(
          ['كوكتيل الناقر', 'Al Naqer Cocktail'],
          [P(90)],
          undefined,
          { badge: SIGNATURE },
        ),
        item(
          ['كوكيز ميكس', 'Cookies Mix'],
          [P(85)],
          ['ايس كريم فانيليا - اوريو - كوكيز سيرب', 'Vanilla ice cream, Oreo, cookies syrup'],
        ),
        item(
          ['بريز جولد', 'Breeze Gold'],
          [P(85)],
          ['مانجو - موز - كيوي', 'Mango, banana, kiwi'],
        ),
        item(
          ['مانجو نت', 'Mango Nut'],
          [P(85)],
          ['مانجو - ايس كريم فانيليا - نعناع فريش - جوز هند', 'Mango, vanilla ice cream, fresh mint, coconut'],
        ),
        item(
          ['ميكس بيري', 'Mix Berry'],
          [P(85)],
          ['فراولة - ميكس بيري - ريد بيري - لبن', 'Strawberry, mixed berries, red berry, milk'],
        ),
        item(
          ['يوجرد فليب', 'Yogurt Flip'],
          [P(85)],
          ['زبادي - موز - فراولة - كيوي - برتقال', 'Yogurt, banana, strawberry, kiwi, orange'],
        ),
        item(
          ['بينا كولادا', 'Piña Colada'],
          [P(85)],
          ['جوز هند - لبن مكثف - أناناس - ايس كريم فانيليا', 'Coconut, condensed milk, pineapple, vanilla ice cream'],
        ),
        item(
          ['ريد بانانا', 'Red Banana'],
          [P(80)],
          ['موز - فراولة - ايس كريم فانيليا', 'Banana, strawberry, vanilla ice cream'],
        ),
        item(
          ['تروبيكال بليد', 'Tropical Blend'],
          [P(75)],
          ['كيوي - برتقال - أناناس', 'Kiwi, orange, pineapple'],
        ),
        item(
          ['فلوريدا', 'Florida'],
          [P(75)],
          ['برتقال - مانجو - جوافة', 'Orange, mango, guava'],
        ),
        item(
          ['تروبيكال', 'Tropical'],
          [P(75)],
          ['مانجو - جوافة - فراولة', 'Mango, guava, strawberry'],
        ),
        item(
          ['هاواي', 'Hawaii'],
          [P(70)],
          ['سفن اب - أناناس - نعناع سيرب', '7Up, pineapple, mint syrup'],
        ),
        item(
          ['صن شاين', 'Sunshine'],
          [P(70)],
          ['سفن اب - ليمون - سيرب رمان', '7Up, lemon, pomegranate syrup'],
        ),
        item(
          ['شيري كولا', 'Cherry Cola'],
          [P(70)],
          ['بيبسي - فليفر شيري', 'Pepsi, cherry flavor'],
        ),
      ],
    },
  ],
};

const iced: Category = {
  id: 'iced',
  icon: '🧊',
  group: 'drinks',
  layout: 'list',
  name: L('المثلجات', 'Iced & Frozen'),
  sections: [
    {
      title: L('آيس', 'Iced'),
      items: [
        item(['آيس كوفي', 'Iced Coffee'], [P(75)]),
        item(['آيس اسبانش لاتيه', 'Iced Spanish Latte'], [P(85)]),
        item(['آيس موكا أو لاتيه أو كرمل', 'Iced Mocha, Latte or Caramel'], [P(80)]),
        item(['آيس شوكلت', 'Iced Chocolate'], [P(75)]),
      ],
    },
    {
      title: L('مثلجات وحلويات باردة', 'Frozen & cold treats'),
      items: [
        item(['طبق جيلي', 'Jelly Cup'], [P(25)]),
        item(['بولة ايس كريم', 'Ice Cream Scoop'], [P(25)]),
        item(['كراميل', 'Caramel'], [P(62)]),
        item(['فانيليا', 'Vanilla'], [P(62)]),
        item(['شوكلت', 'Chocolate'], [P(62)]),
        item(['نسكافيتشينو', 'Nescafé-ccino'], [P(68)]),
        item(['فرابتشينو', 'Frappuccino'], [P(85)]),
      ],
    },
  ],
};

const shakes: Category = {
  id: 'shakes',
  icon: '🥛',
  group: 'drinks',
  layout: 'list',
  name: L('الميلك شيك والسموزي', 'Milkshakes & Smoothies'),
  sections: [
    {
      items: [
        item(
          ['ميلك شيك', 'Milkshake'],
          [P(80)],
          ['فانيليا - شوكلت - مانجو - فراولة - توت', 'Vanilla, chocolate, mango, strawberry, berry'],
        ),
        item(['ليمون / ليمون نعناع', 'Lemon / Lemon Mint'], [P(70)]),
        item(['اوريو', 'Oreo'], [P(85)]),
        item(['فروت سلاط', 'Fruit Salad'], [P(95)]),
        item(
          ['سموزي', 'Smoothie'],
          [P(75)],
          ['كيوي - مانجو - فراولة - خوخ - بطيخ', 'Kiwi, mango, strawberry, peach, watermelon'],
        ),
      ],
    },
  ],
};

const desserts: Category = {
  id: 'desserts',
  icon: '🧇',
  group: 'drinks',
  layout: 'list',
  name: L('الحلويات', 'Desserts'),
  sections: [
    {
      items: [
        item(
          ['ليمون + شاي زردة + كنافة', 'Lemon + Zarda Tea + Kunafa'],
          [P(140)],
          undefined,
          { badge: OFFER },
        ),
        item(
          ['كنافة نابلسية', 'Nabulsi Kunafa'],
          [P('60 – 95')],
          ['كريمة أو جبنة', 'With cream or cheese'],
        ),
        item(['وافل نوتيلا', 'Nutella Waffle'], [P(120)]),
        item(['وافل شوكلت', 'Chocolate Waffle'], [P(120)]),
        item(['مولتن كيك', 'Molten Cake'], [P(110)]),
        item(['ميني تارت', 'Mini Tart'], [P(110)]),
        item(['بان كيك', 'Pancakes'], [P(110)]),
      ],
    },
  ],
};

const soft: Category = {
  id: 'soft',
  icon: '💧',
  group: 'drinks',
  layout: 'list',
  name: L('سوفت درينكز', 'Soft Drinks'),
  sections: [
    {
      items: [
        item(['مشروب غازي', 'Soft Drink (local alternative brand)'], [P(36)]),
        item(
          ['مياه معدنية', 'Mineral Water'],
          [P(12, ['صغيرة', 'Small']), P(16, ['كبيرة', 'Large'])],
        ),
      ],
    },
  ],
};

export const menu: Category[] = [
  trays,
  mandi,
  grills,
  meals,
  bedouin,
  oriental,
  homestyle,
  starters,
  soups,
  coffee,
  hot,
  juices,
  cocktails,
  iced,
  shakes,
  desserts,
  soft,
];
