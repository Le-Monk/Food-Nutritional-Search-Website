(function () {
  "use strict";

  const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
  const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/search";
  const DEEPL_PROXY_URLS = ["/.netlify/functions/deepl-translate", "/api/deepl-translate"];
  const USDA_KEY_STORAGE = "nourish-search-usda-key";
  const MEAL_STORAGE = "nourish-search-meal";
  const LANGUAGE_STORAGE = "nourish-search-language";
  const TARGET_STORAGE = "nourish-search-target";

  const languages = [
    { code: "en", label: "English", nativeName: "English", dir: "ltr" },
    { code: "zh", label: "Mandarin Chinese", nativeName: "中文", dir: "ltr" },
    { code: "hi", label: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
    { code: "es", label: "Spanish", nativeName: "Español", dir: "ltr" },
    { code: "fr", label: "French", nativeName: "Français", dir: "ltr" },
    { code: "ar", label: "Arabic", nativeName: "العربية", dir: "rtl" },
    { code: "bn", label: "Bengali", nativeName: "বাংলা", dir: "ltr" },
    { code: "ru", label: "Russian", nativeName: "Русский", dir: "ltr" },
    { code: "pt", label: "Portuguese", nativeName: "Português", dir: "ltr" },
    { code: "ur", label: "Urdu", nativeName: "اردو", dir: "rtl" },
  ];

  const dailyTargets = {
    calories: 2000,
    protein: 50,
    fiber: 28,
    carbs: 275,
    fat: 78,
    sugar: 50,
    sodium: 2300,
  };

  const targetModes = {
    snack: 0.15,
    meal: 1 / 3,
    day: 1,
  };

  const deepLTargetLanguages = {
    en: "EN-US",
    zh: "ZH",
    hi: "HI",
    es: "ES",
    fr: "FR",
    ar: "AR",
    bn: "BN",
    ru: "RU",
    pt: "PT-BR",
    ur: "UR",
  };

  const foodPhraseTranslations = [
    { pattern: /\bblancs?\s+de\s+poulet\b/gi, en: "chicken breast" },
    { pattern: /\bpechuguitas?\s+de\s+pollo\b/gi, en: "chicken breast" },
    { pattern: /\bpechugas?\s+de\s+pollo\b/gi, en: "chicken breast" },
    { pattern: /\bfilets?\s+de\s+poulet\b/gi, en: "chicken fillet" },
    { pattern: /\bpoulet\b/gi, en: "chicken" },
    { pattern: /\bpollo\b/gi, en: "chicken" },
    { pattern: /\bdinde\b/gi, en: "turkey" },
    { pattern: /\bdindes\b/gi, en: "turkey" },
    { pattern: /\bœufs?\b/gi, en: "eggs" },
    { pattern: /\boeufs?\b/gi, en: "eggs" },
    { pattern: /\bhuevos?\b/gi, en: "eggs" },
    { pattern: /\bovo?s?\b/gi, en: "eggs" },
    { pattern: /\bnature\b/gi, en: "plain" },
    { pattern: /\bsans\s+nitrite\b/gi, en: "without nitrite" },
    { pattern: /\bsans\s+sucre\b/gi, en: "unsweetened" },
    { pattern: /\bsin\s+az[uú]car\b/gi, en: "unsweetened" },
    { pattern: /\basada?\s+al\s+horno\b/gi, en: "oven roasted" },
    { pattern: /\bau\s+four\b/gi, en: "oven baked" },
    { pattern: /\bal\s+horno\b/gi, en: "oven baked" },
    { pattern: /\bgrill[eé]e?s?\b/gi, en: "grilled" },
    { pattern: /\ba\s+la\s+parrilla\b/gi, en: "grilled" },
    { pattern: /\bfum[eé]e?s?\b/gi, en: "smoked" },
    { pattern: /\bahumado?s?\b/gi, en: "smoked" },
    { pattern: /\bbio\b/gi, en: "organic" },
    { pattern: /\bbiologique?s?\b/gi, en: "organic" },
    { pattern: /\borg[aá]nico?s?\b/gi, en: "organic" },
    { pattern: /\bfrais\b/gi, en: "fresh" },
    { pattern: /\bfra[iî]che?s?\b/gi, en: "fresh" },
    { pattern: /\bfrescos?\b/gi, en: "fresh" },
    { pattern: /\bgrand(e|s)?\b/gi, en: "large" },
    { pattern: /\bgrandes?\b/gi, en: "large" },
    { pattern: /\blibre\s+parcours\b/gi, en: "free range" },
    { pattern: /\bplein\s+air\b/gi, en: "free range" },
    { pattern: /\bcamperos?\b/gi, en: "free range" },
    { pattern: /\blait\b/gi, en: "milk" },
    { pattern: /\bleche\b/gi, en: "milk" },
    { pattern: /\bfromage\b/gi, en: "cheese" },
    { pattern: /\bqueso\b/gi, en: "cheese" },
    { pattern: /\byaourts?\b/gi, en: "yogurt" },
    { pattern: /\byogures?\b/gi, en: "yogurt" },
    { pattern: /\bsaumon\b/gi, en: "salmon" },
    { pattern: /\bsalm[oó]n\b/gi, en: "salmon" },
    { pattern: /\bthon\b/gi, en: "tuna" },
    { pattern: /\bat[uú]n\b/gi, en: "tuna" },
    { pattern: /\briz\b/gi, en: "rice" },
    { pattern: /\barroz\b/gi, en: "rice" },
  ];

  const localizedFoodTerms = {
    en: {},
    zh: { chicken: "鸡肉", breast: "胸肉", eggs: "鸡蛋", plain: "原味", "without nitrite": "不含亚硝酸盐", "oven roasted": "烤箱烤制", "oven baked": "烘烤", grilled: "烤制", smoked: "烟熏", organic: "有机", fresh: "新鲜", large: "大号", "free range": "散养", milk: "牛奶", cheese: "奶酪", yogurt: "酸奶", salmon: "三文鱼", tuna: "金枪鱼", rice: "米饭" },
    hi: { chicken: "चिकन", breast: "ब्रेस्ट", eggs: "अंडे", plain: "सादा", "without nitrite": "नाइट्राइट रहित", "oven roasted": "ओवन रोस्टेड", "oven baked": "ओवन बेक्ड", grilled: "ग्रिल्ड", smoked: "स्मोक्ड", organic: "ऑर्गेनिक", fresh: "ताजा", large: "बड़ा", "free range": "फ्री रेंज", milk: "दूध", cheese: "चीज़", yogurt: "दही", salmon: "सैल्मन", tuna: "टूना", rice: "चावल" },
    es: { chicken: "pollo", breast: "pechuga", eggs: "huevos", plain: "natural", "without nitrite": "sin nitrito", "oven roasted": "asado al horno", "oven baked": "horneado", grilled: "a la parrilla", smoked: "ahumado", organic: "orgánico", fresh: "fresco", large: "grande", "free range": "campero", milk: "leche", cheese: "queso", yogurt: "yogur", salmon: "salmón", tuna: "atún", rice: "arroz" },
    fr: { chicken: "poulet", breast: "blanc", eggs: "oeufs", plain: "nature", "without nitrite": "sans nitrite", "oven roasted": "rôti au four", "oven baked": "cuit au four", grilled: "grillé", smoked: "fumé", organic: "bio", fresh: "frais", large: "grand", "free range": "plein air", milk: "lait", cheese: "fromage", yogurt: "yaourt", salmon: "saumon", tuna: "thon", rice: "riz" },
    ar: { chicken: "دجاج", breast: "صدر", eggs: "بيض", plain: "سادة", "without nitrite": "بدون نتريت", "oven roasted": "مشوي بالفرن", "oven baked": "مخبوز", grilled: "مشوي", smoked: "مدخن", organic: "عضوي", fresh: "طازج", large: "كبير", "free range": "حر التربية", milk: "حليب", cheese: "جبن", yogurt: "زبادي", salmon: "سلمون", tuna: "تونة", rice: "أرز" },
    bn: { chicken: "মুরগি", breast: "বুকের মাংস", eggs: "ডিম", plain: "সাধারণ", "without nitrite": "নাইট্রাইট ছাড়া", "oven roasted": "ওভেনে রোস্ট", "oven baked": "ওভেনে বেকড", grilled: "গ্রিলড", smoked: "স্মোকড", organic: "জৈব", fresh: "তাজা", large: "বড়", "free range": "ফ্রি রেঞ্জ", milk: "দুধ", cheese: "চিজ", yogurt: "দই", salmon: "সালমন", tuna: "টুনা", rice: "ভাত" },
    ru: { chicken: "курица", breast: "грудка", eggs: "яйца", plain: "натуральный", "without nitrite": "без нитрита", "oven roasted": "запеченный в духовке", "oven baked": "запеченный", grilled: "гриль", smoked: "копченый", organic: "органический", fresh: "свежий", large: "крупный", "free range": "свободный выгул", milk: "молоко", cheese: "сыр", yogurt: "йогурт", salmon: "лосось", tuna: "тунец", rice: "рис" },
    pt: { chicken: "frango", breast: "peito", eggs: "ovos", plain: "natural", "without nitrite": "sem nitrito", "oven roasted": "assado no forno", "oven baked": "assado", grilled: "grelhado", smoked: "defumado", organic: "orgânico", fresh: "fresco", large: "grande", "free range": "caipira", milk: "leite", cheese: "queijo", yogurt: "iogurte", salmon: "salmão", tuna: "atum", rice: "arroz" },
    ur: { chicken: "چکن", breast: "بریسٹ", eggs: "انڈے", plain: "سادہ", "without nitrite": "نائٹرائٹ کے بغیر", "oven roasted": "اوون روسٹڈ", "oven baked": "اوون بیکڈ", grilled: "گرلڈ", smoked: "دھواں دار", organic: "آرگینک", fresh: "تازہ", large: "بڑا", "free range": "فری رینج", milk: "دودھ", cheese: "چیز", yogurt: "دہی", salmon: "سالمون", tuna: "ٹونا", rice: "چاول" },
  };

  const nutrientDefs = {
    calories: {
      label: "Calories",
      unit: "",
      usdaNames: ["Energy"],
      offKeys: ["energy-kcal_100g", "energy-kcal"],
    },
    protein: {
      label: "Protein",
      unit: "g",
      usdaNames: ["Protein"],
      offKeys: ["proteins_100g", "proteins"],
    },
    fiber: {
      label: "Fiber",
      unit: "g",
      usdaNames: ["Fiber, total dietary"],
      offKeys: ["fiber_100g", "fiber"],
    },
    carbs: {
      label: "Carbs",
      unit: "g",
      usdaNames: ["Carbohydrate, by difference", "Carbohydrate, by summation"],
      offKeys: ["carbohydrates_100g", "carbohydrates"],
    },
    fat: {
      label: "Fat",
      unit: "g",
      usdaNames: ["Total lipid (fat)", "Total Fat"],
      offKeys: ["fat_100g", "fat"],
    },
    sugar: {
      label: "Sugar",
      unit: "g",
      usdaNames: ["Sugars, total including NLEA", "Sugars, total"],
      offKeys: ["sugars_100g", "sugars"],
    },
    sodium: {
      label: "Sodium",
      unit: "mg",
      usdaNames: ["Sodium, Na"],
      offKeys: ["sodium_100g", "sodium"],
      offMultiplier: 1000,
    },
  };

  const prepKeywords = {
    raw: ["raw", "uncooked", "fresh"],
    boiled: ["boiled", "hard cooked", "hard-cooked", "poached", "steamed"],
    fried: ["fried", "pan fried", "scrambled", "omelet", "omelette", "sauteed"],
    baked: ["baked", "casserole"],
    roasted: ["roasted", "roast"],
    grilled: ["grilled", "broiled", "barbecue"],
    canned: ["canned", "packed in", "drained"],
  };

  const translations = {
    en: {
      skipLink: "Skip to results",
      brandTagline: "Nutrition-first food lookup",
      pageSections: "Page sections",
      navSearch: "Search",
      navMeal: "Meal Calculator",
      navSources: "Sources",
      languageLabel: "Language",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "Find clear nutrition facts by food, serving, and cooking style.",
      heroCopy:
        "Search generic foods, compare records from both databases, and add ingredients to a meal without brand listings or price noise.",
      foodName: "Food name",
      searchPlaceholder: "Try eggs, oats, salmon, rice...",
      searchButton: "Search",
      servingSize: "Serving size",
      usdaKeySummary: "USDA key",
      usdaKeyLabel: "FoodData Central API key",
      pasteKey: "Paste key",
      saveButton: "Save",
      keyStoredLocal: "Stored only in this browser.",
      prepFilter: "Preparation filter",
      prepAll: "All",
      prepRaw: "Raw",
      prepBoiled: "Boiled",
      prepFried: "Fried",
      prepBaked: "Baked",
      prepRoasted: "Roasted",
      prepGrilled: "Grilled",
      prepCanned: "Canned",
      prepGeneral: "General",
      resultsEyebrow: "Food Database",
      resultsTitle: "Search results",
      readyToSearch: "Ready to search.",
      searching: 'Searching nutrition databases for "{query}"...',
      sourcePartial: "Some sources could not be loaded: {errors} Showing available results.",
      noResults: "No nutrition records found. Try a broader food name such as egg or rice.",
      searchFailed: "Search failed. Please try again.",
      resultCount: "{count} result{plural}",
      noPrep: "No {prep} records found for this search. Try All preparations.",
      mealEyebrow: "Menu Builder",
      mealTitle: "Meal nutritional calculator",
      clearButton: "Clear",
      emptyMeal: "Add ingredients from the search results to start a meal total.",
      targetLabel: "Nutrition target",
      targetSnack: "Snack",
      targetMeal: "Single meal",
      targetDay: "Full day",
      sourceEyebrow: "Responsible Nutrition Data",
      sourceTitle: "Source notes",
      sourceCopy:
        "Results normalize nutrition per selected serving grams. USDA records are generally generic food composition records; Open Food Facts records may describe packaged foods and can be incomplete. Cooking style is inferred from record descriptions and categories.",
      addToMeal: "Add to meal",
      removeItem: "Remove {title}",
      targetShort: "{percent}% of target",
      targetValue: "Target {value}",
      measureLow: "Low",
      measureOk: "In range",
      measureHigh: "High",
      measureEmpty: "Add foods",
      notListed: "Not listed",
      usdaKeySaved: "USDA key saved in this browser.",
      usdaKeyRemoved: "USDA key removed from this browser.",
      usdaKeyMissing: "Add a USDA API key to include FoodData Central records.",
      openPackagedRecord: "Open packaged-food record",
      listedServing: "listed serving",
      nutritionPer100: "Nutrition values per 100 g.",
      nutrients: {
        calories: "Calories",
        protein: "Protein",
        fiber: "Fiber",
        carbs: "Carbs",
        fat: "Fat",
        sugar: "Sugar",
        sodium: "Sodium",
      },
    },
    zh: {
      skipLink: "跳到结果",
      brandTagline: "营养优先的食物查询",
      pageSections: "页面部分",
      navSearch: "搜索",
      navMeal: "膳食计算器",
      navSources: "来源",
      languageLabel: "语言",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "按食物、份量和烹饪方式查看清晰营养信息。",
      heroCopy: "搜索通用食物，比较两个数据库记录，并把食材加入膳食，不显示品牌和价格干扰。",
      foodName: "食物名称",
      searchPlaceholder: "试试鸡蛋、燕麦、三文鱼、米饭...",
      searchButton: "搜索",
      servingSize: "份量",
      usdaKeySummary: "USDA 密钥",
      usdaKeyLabel: "FoodData Central API 密钥",
      pasteKey: "粘贴密钥",
      saveButton: "保存",
      keyStoredLocal: "只保存在此浏览器中。",
      prepFilter: "烹饪方式筛选",
      prepAll: "全部",
      prepRaw: "生食",
      prepBoiled: "水煮",
      prepFried: "煎炸",
      prepBaked: "烘烤",
      prepRoasted: "烤制",
      prepGrilled: "炙烤",
      prepCanned: "罐装",
      prepGeneral: "通用",
      resultsEyebrow: "食物数据库",
      resultsTitle: "搜索结果",
      readyToSearch: "可以搜索。",
      searching: "正在为“{query}”搜索营养数据库...",
      sourcePartial: "部分来源无法加载：{errors} 正在显示可用结果。",
      noResults: "未找到营养记录。请尝试更宽泛的食物名称，例如 egg 或 rice。",
      searchFailed: "搜索失败。请重试。",
      resultCount: "{count} 个结果",
      noPrep: "此搜索没有{prep}记录。请尝试全部烹饪方式。",
      mealEyebrow: "菜单生成器",
      mealTitle: "膳食营养计算器",
      clearButton: "清除",
      emptyMeal: "从搜索结果添加食材以开始计算膳食总量。",
      targetLabel: "营养目标",
      targetSnack: "零食",
      targetMeal: "单餐",
      targetDay: "全天",
      sourceEyebrow: "负责任的营养数据",
      sourceTitle: "来源说明",
      sourceCopy: "结果按所选克数换算。USDA 通常提供通用食物组成记录；Open Food Facts 可能包含包装食品记录且数据可能不完整。烹饪方式由描述和分类推断。",
      addToMeal: "加入膳食",
      removeItem: "移除 {title}",
      targetShort: "目标的 {percent}%",
      targetValue: "目标 {value}",
      measureLow: "偏低",
      measureOk: "范围内",
      measureHigh: "偏高",
      measureEmpty: "添加食物",
      notListed: "未列出",
      usdaKeySaved: "USDA 密钥已保存在此浏览器中。",
      usdaKeyRemoved: "USDA 密钥已从此浏览器移除。",
      usdaKeyMissing: "添加 USDA API 密钥以包含 FoodData Central 记录。",
      openPackagedRecord: "开放包装食品记录",
      listedServing: "标注份量",
      nutritionPer100: "营养值按每 100 克。",
      nutrients: { calories: "热量", protein: "蛋白质", fiber: "膳食纤维", carbs: "碳水", fat: "脂肪", sugar: "糖", sodium: "钠" },
    },
    hi: {
      skipLink: "परिणामों पर जाएं",
      brandTagline: "पोषण पहले खाद्य खोज",
      pageSections: "पेज सेक्शन",
      navSearch: "खोज",
      navMeal: "भोजन कैलकुलेटर",
      navSources: "स्रोत",
      languageLabel: "भाषा",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "भोजन, सर्विंग और पकाने के तरीके से साफ पोषण तथ्य खोजें।",
      heroCopy: "सामान्य खाद्य पदार्थ खोजें, दोनों डेटाबेस के रिकॉर्ड की तुलना करें, और ब्रांड या कीमत के बिना भोजन में सामग्री जोड़ें।",
      foodName: "भोजन का नाम",
      searchPlaceholder: "अंडे, ओट्स, सैल्मन, चावल आजमाएं...",
      searchButton: "खोजें",
      servingSize: "सर्विंग आकार",
      usdaKeySummary: "USDA कुंजी",
      usdaKeyLabel: "FoodData Central API कुंजी",
      pasteKey: "कुंजी चिपकाएं",
      saveButton: "सेव",
      keyStoredLocal: "केवल इस ब्राउजर में सेव।",
      prepFilter: "तैयारी फिल्टर",
      prepAll: "सभी",
      prepRaw: "कच्चा",
      prepBoiled: "उबला",
      prepFried: "तला",
      prepBaked: "बेक",
      prepRoasted: "रोस्ट",
      prepGrilled: "ग्रिल",
      prepCanned: "डिब्बाबंद",
      prepGeneral: "सामान्य",
      resultsEyebrow: "खाद्य डेटाबेस",
      resultsTitle: "खोज परिणाम",
      readyToSearch: "खोज के लिए तैयार।",
      searching: '"{query}" के लिए पोषण डेटाबेस खोज रहे हैं...',
      sourcePartial: "कुछ स्रोत लोड नहीं हुए: {errors} उपलब्ध परिणाम दिखाए जा रहे हैं।",
      noResults: "कोई पोषण रिकॉर्ड नहीं मिला। egg या rice जैसा व्यापक नाम आजमाएं।",
      searchFailed: "खोज विफल। फिर कोशिश करें।",
      resultCount: "{count} परिणाम",
      noPrep: "इस खोज के लिए {prep} रिकॉर्ड नहीं मिले। सभी तैयारी आजमाएं।",
      mealEyebrow: "मेनू बिल्डर",
      mealTitle: "भोजन पोषण कैलकुलेटर",
      clearButton: "साफ करें",
      emptyMeal: "भोजन कुल शुरू करने के लिए खोज परिणामों से सामग्री जोड़ें।",
      targetLabel: "पोषण लक्ष्य",
      targetSnack: "नाश्ता",
      targetMeal: "एक भोजन",
      targetDay: "पूरा दिन",
      sourceEyebrow: "जिम्मेदार पोषण डेटा",
      sourceTitle: "स्रोत नोट्स",
      sourceCopy: "परिणाम चुने गए ग्राम सर्विंग के अनुसार सामान्यीकृत होते हैं। USDA आम तौर पर सामान्य खाद्य संरचना रिकॉर्ड देता है; Open Food Facts पैकेज्ड खाद्य रिकॉर्ड दिखा सकता है और डेटा अधूरा हो सकता है। पकाने का तरीका विवरण और श्रेणियों से अनुमानित है।",
      addToMeal: "भोजन में जोड़ें",
      removeItem: "{title} हटाएं",
      targetShort: "लक्ष्य का {percent}%",
      targetValue: "लक्ष्य {value}",
      measureLow: "कम",
      measureOk: "सीमा में",
      measureHigh: "अधिक",
      measureEmpty: "भोजन जोड़ें",
      notListed: "सूचीबद्ध नहीं",
      usdaKeySaved: "USDA कुंजी इस ब्राउजर में सेव है।",
      usdaKeyRemoved: "USDA कुंजी इस ब्राउजर से हटाई गई।",
      usdaKeyMissing: "FoodData Central रिकॉर्ड शामिल करने के लिए USDA API कुंजी जोड़ें।",
      openPackagedRecord: "खुला पैकेज्ड-फूड रिकॉर्ड",
      listedServing: "लिखी सर्विंग",
      nutritionPer100: "पोषण मान प्रति 100 g।",
      nutrients: { calories: "कैलोरी", protein: "प्रोटीन", fiber: "फाइबर", carbs: "कार्ब्स", fat: "वसा", sugar: "चीनी", sodium: "सोडियम" },
    },
    es: {
      skipLink: "Saltar a resultados",
      brandTagline: "Busqueda de alimentos centrada en nutricion",
      pageSections: "Secciones de la pagina",
      navSearch: "Buscar",
      navMeal: "Calculadora",
      navSources: "Fuentes",
      languageLabel: "Idioma",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "Encuentra datos nutricionales claros por alimento, porcion y coccion.",
      heroCopy: "Busca alimentos genericos, compara registros de ambas bases de datos y agrega ingredientes sin marcas ni precios.",
      foodName: "Nombre del alimento",
      searchPlaceholder: "Prueba huevos, avena, salmon, arroz...",
      searchButton: "Buscar",
      servingSize: "Tamano de porcion",
      usdaKeySummary: "Clave USDA",
      usdaKeyLabel: "Clave API de FoodData Central",
      pasteKey: "Pegar clave",
      saveButton: "Guardar",
      keyStoredLocal: "Guardada solo en este navegador.",
      prepFilter: "Filtro de preparacion",
      prepAll: "Todo",
      prepRaw: "Crudo",
      prepBoiled: "Hervido",
      prepFried: "Frito",
      prepBaked: "Horneado",
      prepRoasted: "Asado",
      prepGrilled: "A la parrilla",
      prepCanned: "Enlatado",
      prepGeneral: "General",
      resultsEyebrow: "Base de datos",
      resultsTitle: "Resultados",
      readyToSearch: "Listo para buscar.",
      searching: 'Buscando "{query}" en bases nutricionales...',
      sourcePartial: "No se pudieron cargar algunas fuentes: {errors} Mostrando resultados disponibles.",
      noResults: "No se encontraron registros. Prueba un nombre mas amplio como egg o rice.",
      searchFailed: "La busqueda fallo. Intentalo de nuevo.",
      resultCount: "{count} resultado{plural}",
      noPrep: "No hay registros {prep} para esta busqueda. Prueba todas las preparaciones.",
      mealEyebrow: "Constructor de menu",
      mealTitle: "Calculadora nutricional de comida",
      clearButton: "Limpiar",
      emptyMeal: "Agrega ingredientes desde los resultados para calcular el total.",
      targetLabel: "Objetivo nutricional",
      targetSnack: "Snack",
      targetMeal: "Una comida",
      targetDay: "Dia completo",
      sourceEyebrow: "Datos nutricionales responsables",
      sourceTitle: "Notas de fuentes",
      sourceCopy: "Los resultados se normalizan por gramos de porcion seleccionados. USDA suele tener registros genericos; Open Food Facts puede tener alimentos empaquetados y datos incompletos. La coccion se infiere de descripciones y categorias.",
      addToMeal: "Agregar",
      removeItem: "Eliminar {title}",
      targetShort: "{percent}% del objetivo",
      targetValue: "Objetivo {value}",
      measureLow: "Bajo",
      measureOk: "En rango",
      measureHigh: "Alto",
      measureEmpty: "Agrega alimentos",
      notListed: "No listado",
      usdaKeySaved: "Clave USDA guardada en este navegador.",
      usdaKeyRemoved: "Clave USDA eliminada de este navegador.",
      usdaKeyMissing: "Agrega una clave USDA API para incluir FoodData Central.",
      openPackagedRecord: "Registro abierto de alimento empaquetado",
      listedServing: "porcion indicada",
      nutritionPer100: "Valores por 100 g.",
      nutrients: { calories: "Calorias", protein: "Proteina", fiber: "Fibra", carbs: "Carbs", fat: "Grasa", sugar: "Azucar", sodium: "Sodio" },
    },
    fr: {
      skipLink: "Aller aux resultats",
      brandTagline: "Recherche alimentaire axee nutrition",
      pageSections: "Sections de page",
      navSearch: "Recherche",
      navMeal: "Calculateur",
      navSources: "Sources",
      languageLabel: "Langue",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "Trouvez des donnees nutritionnelles claires par aliment, portion et cuisson.",
      heroCopy: "Recherchez des aliments generiques, comparez les bases de donnees et ajoutez des ingredients sans marques ni prix.",
      foodName: "Nom de l'aliment",
      searchPlaceholder: "Essayez oeufs, avoine, saumon, riz...",
      searchButton: "Rechercher",
      servingSize: "Taille de portion",
      usdaKeySummary: "Cle USDA",
      usdaKeyLabel: "Cle API FoodData Central",
      pasteKey: "Coller la cle",
      saveButton: "Enregistrer",
      keyStoredLocal: "Stockee seulement dans ce navigateur.",
      prepFilter: "Filtre de preparation",
      prepAll: "Tout",
      prepRaw: "Cru",
      prepBoiled: "Bouilli",
      prepFried: "Frit",
      prepBaked: "Cuit au four",
      prepRoasted: "Roti",
      prepGrilled: "Grille",
      prepCanned: "En conserve",
      prepGeneral: "General",
      resultsEyebrow: "Base alimentaire",
      resultsTitle: "Resultats",
      readyToSearch: "Pret a rechercher.",
      searching: 'Recherche de "{query}" dans les bases nutritionnelles...',
      sourcePartial: "Certaines sources n'ont pas charge: {errors} Resultats disponibles affiches.",
      noResults: "Aucun enregistrement trouve. Essayez un terme plus large comme egg ou rice.",
      searchFailed: "La recherche a echoue. Reessayez.",
      resultCount: "{count} resultat{plural}",
      noPrep: "Aucun enregistrement {prep} pour cette recherche. Essayez toutes les preparations.",
      mealEyebrow: "Createur de menu",
      mealTitle: "Calculateur nutritionnel du repas",
      clearButton: "Effacer",
      emptyMeal: "Ajoutez des ingredients depuis les resultats pour commencer le total.",
      targetLabel: "Objectif nutritionnel",
      targetSnack: "Collation",
      targetMeal: "Un repas",
      targetDay: "Jour complet",
      sourceEyebrow: "Donnees nutritionnelles responsables",
      sourceTitle: "Notes sur les sources",
      sourceCopy: "Les resultats sont normalises selon les grammes choisis. USDA fournit surtout des aliments generiques; Open Food Facts peut decrire des aliments emballes et incomplets. La cuisson est deduite des descriptions et categories.",
      addToMeal: "Ajouter au repas",
      removeItem: "Supprimer {title}",
      targetShort: "{percent}% de l'objectif",
      targetValue: "Objectif {value}",
      measureLow: "Bas",
      measureOk: "Dans la plage",
      measureHigh: "Eleve",
      measureEmpty: "Ajoutez des aliments",
      notListed: "Non indique",
      usdaKeySaved: "Cle USDA enregistree dans ce navigateur.",
      usdaKeyRemoved: "Cle USDA supprimee de ce navigateur.",
      usdaKeyMissing: "Ajoutez une cle API USDA pour inclure FoodData Central.",
      openPackagedRecord: "Enregistrement ouvert d'aliment emballe",
      listedServing: "portion indiquee",
      nutritionPer100: "Valeurs nutritionnelles pour 100 g.",
      nutrients: { calories: "Calories", protein: "Proteines", fiber: "Fibres", carbs: "Glucides", fat: "Lipides", sugar: "Sucre", sodium: "Sodium" },
    },
    ar: {
      skipLink: "تخطي إلى النتائج",
      brandTagline: "بحث غذائي يركز على التغذية",
      pageSections: "أقسام الصفحة",
      navSearch: "بحث",
      navMeal: "حاسبة الوجبة",
      navSources: "المصادر",
      languageLabel: "اللغة",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "اعثر على حقائق غذائية واضحة حسب الطعام والحصة وطريقة الطهي.",
      heroCopy: "ابحث عن أطعمة عامة، وقارن السجلات من المصدرين، وأضف المكونات إلى الوجبة بدون علامات تجارية أو أسعار.",
      foodName: "اسم الطعام",
      searchPlaceholder: "جرّب البيض، الشوفان، السلمون، الأرز...",
      searchButton: "بحث",
      servingSize: "حجم الحصة",
      usdaKeySummary: "مفتاح USDA",
      usdaKeyLabel: "مفتاح FoodData Central API",
      pasteKey: "الصق المفتاح",
      saveButton: "حفظ",
      keyStoredLocal: "محفوظ فقط في هذا المتصفح.",
      prepFilter: "تصفية التحضير",
      prepAll: "الكل",
      prepRaw: "نيء",
      prepBoiled: "مسلوق",
      prepFried: "مقلي",
      prepBaked: "مخبوز",
      prepRoasted: "مشوي",
      prepGrilled: "مشوي على النار",
      prepCanned: "معلب",
      prepGeneral: "عام",
      resultsEyebrow: "قاعدة بيانات الطعام",
      resultsTitle: "نتائج البحث",
      readyToSearch: "جاهز للبحث.",
      searching: "جار البحث عن \"{query}\" في قواعد التغذية...",
      sourcePartial: "تعذر تحميل بعض المصادر: {errors} يتم عرض النتائج المتاحة.",
      noResults: "لم يتم العثور على سجلات غذائية. جرب اسما أوسع مثل egg أو rice.",
      searchFailed: "فشل البحث. حاول مرة أخرى.",
      resultCount: "{count} نتيجة",
      noPrep: "لا توجد سجلات {prep} لهذا البحث. جرب كل التحضيرات.",
      mealEyebrow: "منشئ القائمة",
      mealTitle: "حاسبة تغذية الوجبة",
      clearButton: "مسح",
      emptyMeal: "أضف مكونات من نتائج البحث لبدء مجموع الوجبة.",
      targetLabel: "هدف التغذية",
      targetSnack: "وجبة خفيفة",
      targetMeal: "وجبة واحدة",
      targetDay: "يوم كامل",
      sourceEyebrow: "بيانات تغذية مسؤولة",
      sourceTitle: "ملاحظات المصادر",
      sourceCopy: "تتم معايرة النتائج حسب غرامات الحصة المحددة. سجلات USDA عامة غالبا؛ وقد تصف Open Food Facts أطعمة معبأة وقد تكون غير مكتملة. تستنتج طريقة الطهي من الأوصاف والفئات.",
      addToMeal: "أضف للوجبة",
      removeItem: "إزالة {title}",
      targetShort: "{percent}% من الهدف",
      targetValue: "الهدف {value}",
      measureLow: "منخفض",
      measureOk: "ضمن النطاق",
      measureHigh: "مرتفع",
      measureEmpty: "أضف أطعمة",
      notListed: "غير مدرج",
      usdaKeySaved: "تم حفظ مفتاح USDA في هذا المتصفح.",
      usdaKeyRemoved: "تمت إزالة مفتاح USDA من هذا المتصفح.",
      usdaKeyMissing: "أضف مفتاح USDA API لتضمين سجلات FoodData Central.",
      openPackagedRecord: "سجل مفتوح لطعام معبأ",
      listedServing: "الحصة المدرجة",
      nutritionPer100: "القيم الغذائية لكل 100 g.",
      nutrients: { calories: "السعرات", protein: "البروتين", fiber: "الألياف", carbs: "الكربوهيدرات", fat: "الدهون", sugar: "السكر", sodium: "الصوديوم" },
    },
    bn: {
      skipLink: "ফলাফলে যান",
      brandTagline: "পুষ্টি-কেন্দ্রিক খাদ্য অনুসন্ধান",
      pageSections: "পাতার অংশ",
      navSearch: "অনুসন্ধান",
      navMeal: "খাবার ক্যালকুলেটর",
      navSources: "উৎস",
      languageLabel: "ভাষা",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "খাদ্য, পরিবেশন ও রান্নার ধরন অনুযায়ী পরিষ্কার পুষ্টি তথ্য দেখুন।",
      heroCopy: "সাধারণ খাবার খুঁজুন, দুই ডাটাবেসের রেকর্ড তুলনা করুন, এবং ব্র্যান্ড বা দাম ছাড়াই উপকরণ যোগ করুন।",
      foodName: "খাবারের নাম",
      searchPlaceholder: "ডিম, ওটস, সালমন, ভাত চেষ্টা করুন...",
      searchButton: "খুঁজুন",
      servingSize: "পরিবেশন আকার",
      usdaKeySummary: "USDA কী",
      usdaKeyLabel: "FoodData Central API কী",
      pasteKey: "কী পেস্ট করুন",
      saveButton: "সংরক্ষণ",
      keyStoredLocal: "শুধু এই ব্রাউজারে রাখা হয়।",
      prepFilter: "প্রস্তুতি ফিল্টার",
      prepAll: "সব",
      prepRaw: "কাঁচা",
      prepBoiled: "সেদ্ধ",
      prepFried: "ভাজা",
      prepBaked: "বেকড",
      prepRoasted: "রোস্ট",
      prepGrilled: "গ্রিলড",
      prepCanned: "ক্যানজাত",
      prepGeneral: "সাধারণ",
      resultsEyebrow: "খাদ্য ডাটাবেস",
      resultsTitle: "অনুসন্ধান ফলাফল",
      readyToSearch: "অনুসন্ধানের জন্য প্রস্তুত।",
      searching: "\"{query}\" এর জন্য পুষ্টি ডাটাবেস খোঁজা হচ্ছে...",
      sourcePartial: "কিছু উৎস লোড হয়নি: {errors} পাওয়া ফলাফল দেখানো হচ্ছে।",
      noResults: "পুষ্টি রেকর্ড পাওয়া যায়নি। egg বা rice এর মতো বিস্তৃত নাম চেষ্টা করুন।",
      searchFailed: "অনুসন্ধান ব্যর্থ। আবার চেষ্টা করুন।",
      resultCount: "{count} ফলাফল",
      noPrep: "এই অনুসন্ধানে {prep} রেকর্ড নেই। সব প্রস্তুতি চেষ্টা করুন।",
      mealEyebrow: "মেনু নির্মাতা",
      mealTitle: "খাবারের পুষ্টি ক্যালকুলেটর",
      clearButton: "পরিষ্কার",
      emptyMeal: "মোট হিসাব শুরু করতে ফলাফল থেকে উপকরণ যোগ করুন।",
      targetLabel: "পুষ্টি লক্ষ্য",
      targetSnack: "স্ন্যাক",
      targetMeal: "এক বেলা",
      targetDay: "পূর্ণ দিন",
      sourceEyebrow: "দায়িত্বশীল পুষ্টি তথ্য",
      sourceTitle: "উৎস নোট",
      sourceCopy: "নির্বাচিত গ্রাম অনুযায়ী ফলাফল স্বাভাবিক করা হয়। USDA সাধারণ খাদ্য রেকর্ড দেয়; Open Food Facts প্যাকেটজাত খাবার দেখাতে পারে এবং তথ্য অসম্পূর্ণ হতে পারে। রান্নার ধরন বর্ণনা ও বিভাগ থেকে অনুমান করা হয়।",
      addToMeal: "খাবারে যোগ করুন",
      removeItem: "{title} সরান",
      targetShort: "লক্ষ্যের {percent}%",
      targetValue: "লক্ষ্য {value}",
      measureLow: "কম",
      measureOk: "সীমার মধ্যে",
      measureHigh: "বেশি",
      measureEmpty: "খাবার যোগ করুন",
      notListed: "তালিকাভুক্ত নয়",
      usdaKeySaved: "USDA কী এই ব্রাউজারে সংরক্ষিত।",
      usdaKeyRemoved: "USDA কী এই ব্রাউজার থেকে সরানো হয়েছে।",
      usdaKeyMissing: "FoodData Central রেকর্ডের জন্য USDA API কী যোগ করুন।",
      openPackagedRecord: "ওপেন প্যাকেটজাত খাদ্য রেকর্ড",
      listedServing: "লিখিত পরিবেশন",
      nutritionPer100: "প্রতি 100 g পুষ্টিমান।",
      nutrients: { calories: "ক্যালোরি", protein: "প্রোটিন", fiber: "ফাইবার", carbs: "কার্বস", fat: "চর্বি", sugar: "চিনি", sodium: "সোডিয়াম" },
    },
    ru: {
      skipLink: "К результатам",
      brandTagline: "Поиск еды с акцентом на питание",
      pageSections: "Разделы страницы",
      navSearch: "Поиск",
      navMeal: "Калькулятор",
      navSources: "Источники",
      languageLabel: "Язык",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "Находите понятные данные о питании по продукту, порции и способу приготовления.",
      heroCopy: "Ищите обычные продукты, сравнивайте записи двух баз и добавляйте ингредиенты без брендов и цен.",
      foodName: "Название продукта",
      searchPlaceholder: "Попробуйте яйца, овес, лосось, рис...",
      searchButton: "Искать",
      servingSize: "Размер порции",
      usdaKeySummary: "Ключ USDA",
      usdaKeyLabel: "Ключ API FoodData Central",
      pasteKey: "Вставьте ключ",
      saveButton: "Сохранить",
      keyStoredLocal: "Хранится только в этом браузере.",
      prepFilter: "Фильтр приготовления",
      prepAll: "Все",
      prepRaw: "Сырое",
      prepBoiled: "Вареное",
      prepFried: "Жареное",
      prepBaked: "Запеченное",
      prepRoasted: "Жаркое",
      prepGrilled: "Гриль",
      prepCanned: "Консервы",
      prepGeneral: "Общее",
      resultsEyebrow: "База продуктов",
      resultsTitle: "Результаты поиска",
      readyToSearch: "Готово к поиску.",
      searching: "Поиск \"{query}\" в базах питания...",
      sourcePartial: "Некоторые источники не загружены: {errors} Показаны доступные результаты.",
      noResults: "Записи не найдены. Попробуйте более общий термин, например egg или rice.",
      searchFailed: "Поиск не удался. Попробуйте снова.",
      resultCount: "{count} результат(ов)",
      noPrep: "Нет записей {prep} для этого поиска. Попробуйте все способы.",
      mealEyebrow: "Конструктор меню",
      mealTitle: "Калькулятор питания блюда",
      clearButton: "Очистить",
      emptyMeal: "Добавьте ингредиенты из результатов, чтобы начать подсчет.",
      targetLabel: "Цель питания",
      targetSnack: "Перекус",
      targetMeal: "Один прием",
      targetDay: "Весь день",
      sourceEyebrow: "Ответственные данные о питании",
      sourceTitle: "Примечания к источникам",
      sourceCopy: "Результаты пересчитываются на выбранные граммы порции. USDA обычно содержит общие записи; Open Food Facts может описывать упакованные продукты и быть неполным. Способ приготовления определяется по описаниям и категориям.",
      addToMeal: "Добавить",
      removeItem: "Удалить {title}",
      targetShort: "{percent}% цели",
      targetValue: "Цель {value}",
      measureLow: "Мало",
      measureOk: "В норме",
      measureHigh: "Много",
      measureEmpty: "Добавьте еду",
      notListed: "Не указано",
      usdaKeySaved: "Ключ USDA сохранен в этом браузере.",
      usdaKeyRemoved: "Ключ USDA удален из этого браузера.",
      usdaKeyMissing: "Добавьте ключ USDA API, чтобы включить FoodData Central.",
      openPackagedRecord: "Открытая запись упакованного продукта",
      listedServing: "указанная порция",
      nutritionPer100: "Питательные значения на 100 g.",
      nutrients: { calories: "Калории", protein: "Белок", fiber: "Клетчатка", carbs: "Углеводы", fat: "Жиры", sugar: "Сахар", sodium: "Натрий" },
    },
    pt: {
      skipLink: "Ir para resultados",
      brandTagline: "Busca de alimentos focada em nutricao",
      pageSections: "Secoes da pagina",
      navSearch: "Buscar",
      navMeal: "Calculadora",
      navSources: "Fontes",
      languageLabel: "Idioma",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "Encontre fatos nutricionais claros por alimento, porcao e preparo.",
      heroCopy: "Pesquise alimentos genericos, compare registros das duas bases e adicione ingredientes sem marcas ou precos.",
      foodName: "Nome do alimento",
      searchPlaceholder: "Tente ovos, aveia, salmao, arroz...",
      searchButton: "Buscar",
      servingSize: "Tamanho da porcao",
      usdaKeySummary: "Chave USDA",
      usdaKeyLabel: "Chave API FoodData Central",
      pasteKey: "Colar chave",
      saveButton: "Salvar",
      keyStoredLocal: "Salva apenas neste navegador.",
      prepFilter: "Filtro de preparo",
      prepAll: "Tudo",
      prepRaw: "Cru",
      prepBoiled: "Cozido",
      prepFried: "Frito",
      prepBaked: "Assado",
      prepRoasted: "Tostado",
      prepGrilled: "Grelhado",
      prepCanned: "Enlatado",
      prepGeneral: "Geral",
      resultsEyebrow: "Base alimentar",
      resultsTitle: "Resultados",
      readyToSearch: "Pronto para buscar.",
      searching: 'Buscando "{query}" nas bases nutricionais...',
      sourcePartial: "Algumas fontes nao carregaram: {errors} Mostrando resultados disponiveis.",
      noResults: "Nenhum registro encontrado. Tente um nome mais amplo como egg ou rice.",
      searchFailed: "A busca falhou. Tente novamente.",
      resultCount: "{count} resultado{plural}",
      noPrep: "Nenhum registro {prep} para esta busca. Tente todos os preparos.",
      mealEyebrow: "Construtor de menu",
      mealTitle: "Calculadora nutricional da refeicao",
      clearButton: "Limpar",
      emptyMeal: "Adicione ingredientes dos resultados para iniciar o total.",
      targetLabel: "Meta nutricional",
      targetSnack: "Lanche",
      targetMeal: "Uma refeicao",
      targetDay: "Dia inteiro",
      sourceEyebrow: "Dados nutricionais responsaveis",
      sourceTitle: "Notas das fontes",
      sourceCopy: "Os resultados sao normalizados pelos gramas selecionados. USDA geralmente tem registros genericos; Open Food Facts pode trazer alimentos embalados e dados incompletos. O preparo e inferido por descricoes e categorias.",
      addToMeal: "Adicionar",
      removeItem: "Remover {title}",
      targetShort: "{percent}% da meta",
      targetValue: "Meta {value}",
      measureLow: "Baixo",
      measureOk: "Na faixa",
      measureHigh: "Alto",
      measureEmpty: "Adicione alimentos",
      notListed: "Nao listado",
      usdaKeySaved: "Chave USDA salva neste navegador.",
      usdaKeyRemoved: "Chave USDA removida deste navegador.",
      usdaKeyMissing: "Adicione uma chave USDA API para incluir FoodData Central.",
      openPackagedRecord: "Registro aberto de alimento embalado",
      listedServing: "porcao listada",
      nutritionPer100: "Valores nutricionais por 100 g.",
      nutrients: { calories: "Calorias", protein: "Proteina", fiber: "Fibra", carbs: "Carbs", fat: "Gordura", sugar: "Acucar", sodium: "Sodio" },
    },
    ur: {
      skipLink: "نتائج پر جائیں",
      brandTagline: "غذائیت پہلے خوراک تلاش",
      pageSections: "صفحہ حصے",
      navSearch: "تلاش",
      navMeal: "کھانا کیلکولیٹر",
      navSources: "ذرائع",
      languageLabel: "زبان",
      heroEyebrow: "USDA + Open Food Facts",
      heroTitle: "خوراک، سرونگ اور پکانے کے انداز کے مطابق صاف غذائی حقائق دیکھیں۔",
      heroCopy: "عام غذائیں تلاش کریں، دونوں ڈیٹابیس ریکارڈ موازنہ کریں، اور برانڈ یا قیمت کے بغیر اجزا شامل کریں۔",
      foodName: "خوراک کا نام",
      searchPlaceholder: "انڈے، اوٹس، سالمون، چاول آزمائیں...",
      searchButton: "تلاش",
      servingSize: "سرونگ سائز",
      usdaKeySummary: "USDA کلید",
      usdaKeyLabel: "FoodData Central API کلید",
      pasteKey: "کلید پیسٹ کریں",
      saveButton: "محفوظ",
      keyStoredLocal: "صرف اس براؤزر میں محفوظ۔",
      prepFilter: "تیاری فلٹر",
      prepAll: "سب",
      prepRaw: "کچا",
      prepBoiled: "ابلا",
      prepFried: "تلا",
      prepBaked: "بیک",
      prepRoasted: "روسٹ",
      prepGrilled: "گرل",
      prepCanned: "ڈبہ بند",
      prepGeneral: "عام",
      resultsEyebrow: "خوراک ڈیٹابیس",
      resultsTitle: "تلاش نتائج",
      readyToSearch: "تلاش کے لئے تیار۔",
      searching: "\"{query}\" کے لئے غذائی ڈیٹابیس تلاش ہو رہی ہے...",
      sourcePartial: "کچھ ذرائع لوڈ نہیں ہوئے: {errors} دستیاب نتائج دکھائے جا رہے ہیں۔",
      noResults: "کوئی غذائی ریکارڈ نہیں ملا۔ egg یا rice جیسا وسیع نام آزمائیں۔",
      searchFailed: "تلاش ناکام۔ دوبارہ کوشش کریں۔",
      resultCount: "{count} نتائج",
      noPrep: "اس تلاش کے لئے {prep} ریکارڈ نہیں۔ تمام تیاری آزمائیں۔",
      mealEyebrow: "مینو بلڈر",
      mealTitle: "کھانے کی غذائیت کیلکولیٹر",
      clearButton: "صاف",
      emptyMeal: "کل شروع کرنے کے لئے تلاش نتائج سے اجزا شامل کریں۔",
      targetLabel: "غذائی ہدف",
      targetSnack: "سنیک",
      targetMeal: "ایک کھانا",
      targetDay: "پورا دن",
      sourceEyebrow: "ذمہ دار غذائی ڈیٹا",
      sourceTitle: "ذرائع نوٹس",
      sourceCopy: "نتائج منتخب گرام سرونگ کے مطابق نارمل ہوتے ہیں۔ USDA عموما عام خوراک ریکارڈ دیتا ہے؛ Open Food Facts پیک شدہ غذا دکھا سکتا ہے اور ڈیٹا نامکمل ہو سکتا ہے۔ پکانے کا انداز تفصیل اور زمرہ سے اندازہ کیا جاتا ہے۔",
      addToMeal: "کھانے میں شامل",
      removeItem: "{title} ہٹائیں",
      targetShort: "ہدف کا {percent}%",
      targetValue: "ہدف {value}",
      measureLow: "کم",
      measureOk: "حد میں",
      measureHigh: "زیادہ",
      measureEmpty: "خوراک شامل کریں",
      notListed: "درج نہیں",
      usdaKeySaved: "USDA کلید اس براؤزر میں محفوظ ہے۔",
      usdaKeyRemoved: "USDA کلید اس براؤزر سے ہٹا دی گئی۔",
      usdaKeyMissing: "FoodData Central ریکارڈ کے لئے USDA API کلید شامل کریں۔",
      openPackagedRecord: "اوپن پیک شدہ خوراک ریکارڈ",
      listedServing: "درج سرونگ",
      nutritionPer100: "غذائی اقدار فی 100 g۔",
      nutrients: { calories: "کیلوریز", protein: "پروٹین", fiber: "فائبر", carbs: "کاربس", fat: "چربی", sugar: "چینی", sodium: "سوڈیم" },
    },
  };

  const state = {
    allResults: [],
    mealItems: loadMeal(),
    activePrep: "all",
    lastQuery: "",
    language: loadLanguage(),
    targetMode: localStorage.getItem(TARGET_STORAGE) || "meal",
  };

  const form = document.querySelector("#food-search-form");
  const queryInput = document.querySelector("#food-query");
  const servingInput = document.querySelector("#serving-size");
  const resultsGrid = document.querySelector("#results-grid");
  const resultCount = document.querySelector("#result-count");
  const statusMessage = document.querySelector("#status-message");
  const template = document.querySelector("#result-card-template");
  const mealItems = document.querySelector("#meal-items");
  const keyInput = document.querySelector("#usda-key");
  const saveKeyButton = document.querySelector("#save-key");
  const keyStatus = document.querySelector("#key-status");
  const prepButtons = Array.from(document.querySelectorAll(".prep-chip"));
  const languageSelect = document.querySelector("#language-select");
  const targetModeSelect = document.querySelector("#target-mode");

  initialize();

  function initialize() {
    buildLanguageOptions();
    languageSelect.value = state.language;
    targetModeSelect.value = state.targetMode;

    form.addEventListener("submit", handleSearch);
    saveKeyButton.addEventListener("click", saveKey);
    servingInput.addEventListener("change", syncServingInputs);
    document.querySelector("#clear-meal").addEventListener("click", clearMeal);
    languageSelect.addEventListener("change", changeLanguage);
    targetModeSelect.addEventListener("change", changeTargetMode);

    prepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        prepButtons.forEach((chip) => chip.classList.remove("active"));
        button.classList.add("active");
        state.activePrep = button.dataset.prep;
        renderResults();
      });
    });

    applyTranslations();
    setStatus(t("readyToSearch"), false);
    const storedKey = localStorage.getItem(USDA_KEY_STORAGE);
    if (storedKey) {
      keyInput.value = storedKey;
      keyStatus.textContent = t("usdaKeySaved");
    }
    renderMeal();
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (!query) {
      return;
    }

    await runSearch(query);
  }

  async function runSearch(query) {
    state.lastQuery = query;
    state.allResults = [];
    resultsGrid.innerHTML = "";
    setStatus(t("searching", { query }), false);
    resultCount.textContent = t("searchButton") + "...";

    try {
      const [usdaResult, offResult] = await Promise.allSettled([
        searchUsda(query),
        searchOpenFoodFacts(query),
      ]);

      const combined = [];
      if (usdaResult.status === "fulfilled") {
        combined.push(...usdaResult.value);
      }
      if (offResult.status === "fulfilled") {
        combined.push(...offResult.value);
      }

      const errors = [usdaResult, offResult]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message);

      state.allResults = dedupeResults(combined).sort(sortByPreparationMatch(query));
      renderResults();

      if (errors.length) {
        setStatus(t("sourcePartial", { errors: errors.join(" ") }), true);
      } else if (!state.allResults.length) {
        setStatus(t("noResults"), true);
      } else {
        setStatus("");
      }
    } catch (error) {
      setStatus(error.message || t("searchFailed"), true);
      resultCount.textContent = t("resultCount", { count: 0, plural: "s" });
    }
  }

  async function searchUsda(query) {
    const apiKey = keyInput.value.trim() || localStorage.getItem(USDA_KEY_STORAGE);
    if (!apiKey) {
      throw new Error(t("usdaKeyMissing"));
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      query,
      pageSize: "18",
      sortBy: "dataType.keyword",
      sortOrder: "asc",
    });
    ["Foundation", "SR Legacy", "Survey (FNDDS)"].forEach((dataType) => {
      params.append("dataType", dataType);
    });

    let response = await fetch(`${USDA_SEARCH_URL}?${params}`);
    if (!response.ok) {
      const fallbackParams = new URLSearchParams({
        api_key: apiKey,
        query,
        pageSize: "30",
      });
      response = await fetch(`${USDA_SEARCH_URL}?${fallbackParams}`);
    }

    if (!response.ok) {
      throw new Error(`USDA returned ${response.status}.`);
    }

    const data = await response.json();
    return (data.foods || [])
      .filter((food) => food.dataType !== "Branded")
      .map(normalizeUsdaFood)
      .filter(Boolean)
      .slice(0, 18);
  }

  async function searchOpenFoodFacts(query) {
    const localizedFields = openFoodFactsFields();
    const params = new URLSearchParams({
      search_terms: query,
      page_size: "18",
      lc: state.language,
      fields: localizedFields,
    });

    let products = [];
    let firstError = null;

    try {
      const textData = await fetchOpenFoodFacts(params);
      products = (textData.products || []).filter((product) => productMatchesQuery(product, query));
    } catch (error) {
      firstError = error;
    }

    if (products.length < 3) {
      const categoryParams = new URLSearchParams({
        categories_tags_en: categorySlug(query),
        page_size: "18",
        lc: state.language,
        fields: localizedFields,
      });
      try {
        const categoryData = await fetchOpenFoodFacts(categoryParams);
        products = products.concat(categoryData.products || []);
      } catch (error) {
        if (!products.length) {
          throw firstError || error;
        }
      }
    }

    const matchedProducts = products
      .filter((product) => productMatchesQuery(product, query))
      .slice(0, 18);
    const translatedNames = await translateOpenFoodFactsProductNames(matchedProducts, query);

    return matchedProducts
      .map((product, index) => normalizeOpenFoodFactsFood(product, query, translatedNames[index]))
      .filter(Boolean);
  }

  async function fetchOpenFoodFacts(params) {
    const response = await fetch(`${OPEN_FOOD_FACTS_URL}?${params}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts returned ${response.status}.`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error("Open Food Facts returned an unreadable response.");
    }
  }

  async function translateOpenFoodFactsProductNames(products, query) {
    const fallbackNames = products.map((product) => bestProductName(product, query));
    const targetLang = deepLTargetLanguages[state.language];
    if (!targetLang || !products.length) {
      return fallbackNames;
    }

    const sourceNames = products.map((product) => sourceProductNameForDeepL(product, query));
    if (!sourceNames.some(Boolean)) {
      return fallbackNames;
    }

    const payload = {
      text: sourceNames,
      target_lang: targetLang,
      context: `These are short food product names from a nutrition search for "${query}". Translate the food name clearly and concisely. Preserve product nutrition meaning, but do not include brands or prices.`,
    };

    for (const url of DEEPL_PROXY_URLS) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        const translated = (data.translations || []).map((entry) => entry.text || "");
        if (translated.length === sourceNames.length) {
          return translated.map((text, index) => cleanFoodName(text) || fallbackNames[index]);
        }
      } catch {
        // Try the next proxy URL, then fall back to local phrase cleanup.
      }
    }

    return fallbackNames;
  }

  function sourceProductNameForDeepL(product, query) {
    return cleanSourceProductText(
      product.product_name
        || product.generic_name
        || product[`product_name_${state.language}`]
        || product[`generic_name_${state.language}`]
        || product.product_name_en
        || product.generic_name_en
        || product.categories
        || product.categories_en
        || query,
    );
  }

  function cleanSourceProductText(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => !/^[a-z]{2}:/i.test(part))
      .join(", ")
      .replace(/\s+/g, " ")
      .replace(/, UPC:.*/i, "")
      .trim();
  }

  function normalizeUsdaFood(food) {
    const nutrients = {};
    for (const [key, def] of Object.entries(nutrientDefs)) {
      nutrients[key] = readUsdaNutrient(food.foodNutrients || [], def);
    }

    if (!hasUsefulNutrients(nutrients)) {
      return null;
    }

    const title = titleCase(cleanFoodName(food.description || "USDA food"));
    const prep = inferPreparation([food.description, food.additionalDescriptions, food.foodCategory]);

    return {
      id: `usda-${food.fdcId}`,
      source: "USDA",
      sourceClass: "usda",
      title,
      prep,
      meta: [food.dataType, food.foodCategory].filter(Boolean).join(" - "),
      baseGrams: 100,
      nutrients,
    };
  }

  function normalizeOpenFoodFactsFood(product, query, translatedName) {
    const nutriments = product.nutriments || {};
    const nutrients = {};
    for (const [key, def] of Object.entries(nutrientDefs)) {
      nutrients[key] = readOpenFoodFactsNutrient(nutriments, def);
    }

    if (!hasUsefulNutrients(nutrients)) {
      return null;
    }

    const name = translatedName || bestProductName(product, query);
    const categories = localizedProductValue(product, "categories");
    const prep = inferPreparation([name, categories]);
    const metaParts = [t("openPackagedRecord")];
    if (product.quantity) {
      metaParts.push(product.quantity);
    }
    if (product.serving_size) {
      metaParts.push(`${t("listedServing")}: ${product.serving_size}`);
    }
    if (product.nutriscore_grade) {
      metaParts.push(`Nutri-Score ${String(product.nutriscore_grade).toUpperCase()}`);
    }
    if (product.nova_group) {
      metaParts.push(`NOVA ${product.nova_group}`);
    }

    return {
      id: `off-${product.code || crypto.randomUUID()}`,
      source: "Open Food Facts",
      sourceClass: "off",
      title: formatFoodTitle(name),
      prep,
      meta: metaParts.join(" - "),
      baseGrams: 100,
      nutrients,
    };
  }

  function readUsdaNutrient(foodNutrients, def) {
    const match = foodNutrients.find((entry) => {
      const name = (entry.nutrientName || entry.nutrient?.name || "").toLowerCase();
      return def.usdaNames.some((candidate) => name === candidate.toLowerCase());
    });
    const value = Number(match?.value ?? match?.amount);
    return Number.isFinite(value) ? value : null;
  }

  function readOpenFoodFactsNutrient(nutriments, def) {
    for (const key of def.offKeys) {
      const value = Number(nutriments[key]);
      if (Number.isFinite(value)) {
        return value * (def.offMultiplier || 1);
      }
    }
    return null;
  }

  function hasUsefulNutrients(nutrients) {
    return Object.values(nutrients).some((value) => Number.isFinite(value) && value > 0);
  }

  function openFoodFactsFields() {
    const localized = [
      `product_name_${state.language}`,
      `generic_name_${state.language}`,
      `categories_${state.language}`,
      "product_name_en",
      "generic_name_en",
      "categories_en",
    ];
    return [
      "code",
      "product_name",
      "generic_name",
      "categories",
      "lang",
      "languages_tags",
      ...localized,
      "quantity",
      "serving_size",
      "nutriments",
      "nutriscore_grade",
      "nova_group",
    ].join(",");
  }

  function localizedProductValue(product, field) {
    return product[`${field}_${state.language}`] || product[`${field}_en`] || product[field] || "";
  }

  function bestProductName(product, query) {
    const localizedNames = [
      product[`product_name_${state.language}`],
      product[`generic_name_${state.language}`],
    ]
      .map(displayNameCandidate)
      .filter(Boolean);
    const translatedNames = [
      product.product_name,
      product.generic_name,
    ]
      .map((value) => translateFoodName(value, state.language))
      .filter(Boolean);
    const englishNames = [product.product_name_en, product.generic_name_en]
      .map(displayNameCandidate)
      .filter(Boolean);
    const localizedCategories = [product[`categories_${state.language}`]]
      .map(displayNameCandidate)
      .filter(Boolean);
    const englishCategories = [product.categories_en]
      .map(displayNameCandidate)
      .filter(Boolean);
    const translatedCategories = [product.categories]
      .filter((value) => queryTermsMatch(value, query) || !firstDisplayableName([...localizedNames, ...englishNames]))
      .map((value) => translateFoodName(value, state.language));

    return firstDisplayableName([
      ...localizedNames,
      ...translatedNames,
      ...englishNames,
      ...localizedCategories,
      ...englishCategories,
      ...translatedCategories,
    ])
      || translateFoodName(fallbackFoodName(query), state.language);
  }

  function displayNameCandidate(value) {
    if (!value) {
      return "";
    }
    return state.language === "en" ? translateFoodName(value, state.language) : cleanFoodName(value);
  }

  function firstDisplayableName(candidates) {
    return candidates.find((candidate) => cleanFoodName(candidate));
  }

  function translateFoodName(value, targetLanguage) {
    const cleaned = cleanFoodName(value);
    if (!cleaned) {
      return "";
    }

    let english = cleaned;
    foodPhraseTranslations.forEach(({ pattern, en }) => {
      english = english.replace(pattern, en);
    });
    english = cleanTranslatedFoodName(english);
    english = improveEnglishFoodPhrase(english);

    if (!english || english === cleaned) {
      return english || cleaned;
    }
    return localizeEnglishFoodPhrase(english, targetLanguage);
  }

  function cleanTranslatedFoodName(value) {
    return String(value)
      .replace(/\b(de|des|du|d'|la|le|les|el|del|al|en|y|et|a|à|au|aux|con|de\s+la)\b/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^,|,$/g, "")
      .trim();
  }

  function improveEnglishFoodPhrase(value) {
    let phrase = value;
    const modifiers = ["oven roasted", "oven baked", "grilled", "smoked", "organic", "fresh", "plain", "free range"];
    modifiers.forEach((modifier) => {
      if (phrase.includes("chicken breast") && phrase.includes(modifier)) {
        phrase = phrase.replace(modifier, "").replace("chicken breast", `${modifier} chicken breast`);
      }
      if (phrase.includes("eggs") && phrase.includes(modifier)) {
        phrase = phrase.replace(modifier, "").replace("eggs", `${modifier} eggs`);
      }
    });
    return phrase.replace(/\s+/g, " ").trim();
  }

  function localizeEnglishFoodPhrase(value, targetLanguage) {
    const terms = localizedFoodTerms[targetLanguage] || {};
    let localized = value;

    Object.entries(terms)
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([english, translated]) => {
        localized = localized.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "gi"), translated);
      });

    return localized;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function productMatchesQuery(product, query) {
    const needle = normalizeSearchTerm(query);
    const haystack = normalizeSearchTerm(
      [
        product.generic_name,
        product.product_name,
        product.categories,
        localizedProductValue(product, "generic_name"),
        localizedProductValue(product, "product_name"),
        localizedProductValue(product, "categories"),
        translateFoodName(product.generic_name, "en"),
        translateFoodName(product.product_name, "en"),
        translateFoodName(product.categories, "en"),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return needle
      .split(" ")
      .filter(Boolean)
      .some((term) => haystack.includes(term));
  }

  function queryTermsMatch(value, query) {
    const normalizedValue = normalizeSearchTerm(value);
    return normalizeSearchTerm(query)
      .split(" ")
      .filter(Boolean)
      .some((term) => normalizedValue.includes(term));
  }

  function fallbackFoodName(query) {
    const cleanQuery = cleanFoodName(query);
    return cleanQuery || t("openPackagedRecord");
  }

  function normalizeSearchTerm(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(" ")
      .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word))
      .join(" ")
      .trim();
  }

  function categorySlug(query) {
    return String(query)
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .trim()
      .replace(/\s+/g, "-");
  }

  function inferPreparation(parts) {
    const text = parts.filter(Boolean).join(" ").toLowerCase();
    for (const [prep, keywords] of Object.entries(prepKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return prep;
      }
    }
    return "general";
  }

  function renderResults() {
    const servingGrams = getServingGrams();
    const filtered = state.allResults.filter((item) => {
      return state.activePrep === "all" || item.prep === state.activePrep;
    });

    resultsGrid.innerHTML = "";
    resultCount.textContent = resultCountText(filtered.length);

    if (!filtered.length && state.allResults.length) {
      setStatus(t("noPrep", { prep: prepLabel(state.activePrep).toLowerCase() }), true);
      return;
    }

    if (state.allResults.length && statusMessage.textContent.startsWith("No ")) {
      setStatus("");
    }

    filtered.forEach((item) => {
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.id = item.id;
      card.querySelector("h3").textContent = item.title;
      card.querySelector(".result-meta").textContent = item.meta || t("nutritionPer100");

      const sourcePill = card.querySelector(".source-pill");
      sourcePill.textContent = item.source;
      sourcePill.classList.add(item.sourceClass);

      card.querySelector(".prep-pill").textContent = prepLabel(item.prep);
      card.querySelector(".add-button").textContent = t("addToMeal");

      const servingControl = card.querySelector(".card-serving");
      servingControl.value = servingGrams;
      servingControl.addEventListener("change", () => renderCardNutrition(card, item));

      card.querySelector(".add-button").addEventListener("click", () => {
        const grams = clampServing(Number(servingControl.value));
        addMealItem(item, grams);
      });

      renderCardNutrition(card, item);
      resultsGrid.append(card);
    });
  }

  function renderCardNutrition(card, item) {
    const grams = clampServing(Number(card.querySelector(".card-serving").value));
    card.querySelector(".card-serving").value = grams;
    const scaled = scaleNutrients(item.nutrients, grams, item.baseGrams);
    const grid = card.querySelector(".nutrition-grid");
    grid.innerHTML = "";

    Object.entries(nutrientDefs).forEach(([key, def]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      term.textContent = nutrientLabel(key);
      value.textContent = formatNutrient(key, scaled[key]);
      row.append(term, value);
      grid.append(row);
    });
  }

  function syncServingInputs() {
    const grams = getServingGrams();
    document.querySelectorAll(".card-serving").forEach((input) => {
      input.value = grams;
    });
    document.querySelectorAll(".result-card").forEach((card) => {
      const item = state.allResults.find((result) => result.id === card.dataset.id);
      if (item) {
        renderCardNutrition(card, item);
      }
    });
  }

  function addMealItem(item, grams) {
    state.mealItems.push({
      mealId: `${item.id}-${Date.now()}`,
      id: item.id,
      title: item.title,
      source: item.source,
      prep: item.prep,
      grams,
      nutrients: scaleNutrients(item.nutrients, grams, item.baseGrams),
    });
    saveMeal();
    renderMeal();
  }

  function renderMeal() {
    mealItems.innerHTML = "";
    if (!state.mealItems.length) {
      const empty = document.createElement("p");
      empty.className = "empty-meal";
      empty.textContent = t("emptyMeal");
      mealItems.append(empty);
    } else {
      state.mealItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "meal-item";

        const text = document.createElement("div");
        const title = document.createElement("strong");
        const meta = document.createElement("small");
        title.textContent = item.title;
        meta.textContent = `${item.grams} g - ${prepLabel(item.prep)} - ${item.source}`;
        text.append(title, meta);

        const remove = document.createElement("button");
        remove.className = "remove-meal-item";
        remove.type = "button";
        remove.setAttribute("aria-label", t("removeItem", { title: item.title }));
        remove.textContent = "x";
        remove.addEventListener("click", () => {
          state.mealItems = state.mealItems.filter((mealItem) => mealItem.mealId !== item.mealId);
          saveMeal();
          renderMeal();
        });

        row.append(text, remove);
        mealItems.append(row);
      });
    }

    const totals = calculateTotals();
    Object.keys(nutrientDefs).forEach((key) => {
      const totalValue = Number(totals[key]) || 0;
      const target = document.querySelector(`[data-total="${key}"]`);
      if (target) {
        target.textContent = formatNutrient(key, totalValue);
      }
      renderNutrientMeasure(key, totalValue);
    });
  }

  function calculateTotals() {
    const baseTotals = Object.fromEntries(Object.keys(nutrientDefs).map((key) => [key, 0]));
    return state.mealItems.reduce((totals, item) => {
      Object.keys(nutrientDefs).forEach((key) => {
        totals[key] = (totals[key] || 0) + (Number(item.nutrients[key]) || 0);
      });
      return totals;
    }, baseTotals);
  }

  function renderNutrientMeasure(key, value) {
    const card = document.querySelector(`[data-total-card="${key}"]`);
    if (!card) {
      return;
    }

    let measure = card.querySelector(".nutrient-measure");
    if (!measure) {
      measure = document.createElement("div");
      measure.className = "nutrient-measure";
      measure.innerHTML = `
        <div class="measure-topline">
          <span class="measure-badge"></span>
          <span class="measure-target"></span>
        </div>
        <div class="measure-track" aria-hidden="true"><span class="measure-fill"></span></div>
      `;
      card.append(measure);
    }

    const target = nutrientTarget(key);
    const amount = Number(value) || 0;
    const ratio = target > 0 ? amount / target : 0;
    const status = measureStatus(ratio);
    const badge = measure.querySelector(".measure-badge");
    const targetText = measure.querySelector(".measure-target");
    const fill = measure.querySelector(".measure-fill");

    badge.className = `measure-badge ${status}`;
    fill.className = `measure-fill ${status}`;
    badge.textContent = state.mealItems.length ? measureLabel(status) : t("measureEmpty");
    targetText.textContent = t("targetValue", { value: formatNutrient(key, target) });
    fill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
    measure.setAttribute(
      "aria-label",
      `${nutrientLabel(key)}: ${t("targetShort", { percent: Math.round(ratio * 100) })}`,
    );
  }

  function nutrientTarget(key) {
    return dailyTargets[key] * (targetModes[state.targetMode] || targetModes.meal);
  }

  function measureStatus(ratio) {
    if (ratio < 0.75) {
      return "low";
    }
    if (ratio > 1.2) {
      return "high";
    }
    return "ok";
  }

  function measureLabel(status) {
    if (status === "low") {
      return t("measureLow");
    }
    if (status === "high") {
      return t("measureHigh");
    }
    return t("measureOk");
  }

  function clearMeal() {
    state.mealItems = [];
    saveMeal();
    renderMeal();
  }

  function saveKey() {
    const key = keyInput.value.trim();
    if (!key) {
      localStorage.removeItem(USDA_KEY_STORAGE);
      keyStatus.textContent = t("usdaKeyRemoved");
      return;
    }
    localStorage.setItem(USDA_KEY_STORAGE, key);
    keyStatus.textContent = t("usdaKeySaved");
  }

  function buildLanguageOptions() {
    languageSelect.innerHTML = "";
    languages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = `${language.label} (${language.nativeName})`;
      languageSelect.append(option);
    });
  }

  async function changeLanguage() {
    state.language = languageSelect.value || "en";
    localStorage.setItem(LANGUAGE_STORAGE, state.language);
    applyTranslations();
    renderMeal();
    if (state.lastQuery) {
      await runSearch(state.lastQuery);
    } else {
      renderResults();
    }
  }

  function changeTargetMode() {
    state.targetMode = targetModeSelect.value || "meal";
    localStorage.setItem(TARGET_STORAGE, state.targetMode);
    renderMeal();
  }

  function applyTranslations() {
    const language = languages.find((entry) => entry.code === state.language) || languages[0];
    document.documentElement.lang = state.language;
    document.documentElement.dir = language.dir;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-nutrient-label]").forEach((element) => {
      element.textContent = nutrientLabel(element.dataset.nutrientLabel);
    });

    resultCount.textContent = state.allResults.length
      ? resultCountText(document.querySelectorAll(".result-card").length)
      : t("readyToSearch");
    if (!state.allResults.length && !statusMessage.textContent.trim()) {
      setStatus(t("readyToSearch"), false);
    }
  }

  function loadLanguage() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE);
    return languages.some((language) => language.code === stored) ? stored : "en";
  }

  function loadMeal() {
    try {
      return JSON.parse(localStorage.getItem(MEAL_STORAGE) || "[]");
    } catch {
      return [];
    }
  }

  function saveMeal() {
    localStorage.setItem(MEAL_STORAGE, JSON.stringify(state.mealItems));
  }

  function getServingGrams() {
    const grams = clampServing(Number(servingInput.value));
    servingInput.value = grams;
    return grams;
  }

  function clampServing(value) {
    if (!Number.isFinite(value)) {
      return 100;
    }
    return Math.min(1000, Math.max(1, Math.round(value)));
  }

  function scaleNutrients(nutrients, grams, baseGrams) {
    const factor = grams / baseGrams;
    return Object.fromEntries(
      Object.keys(nutrientDefs).map((key) => [
        key,
        Number.isFinite(nutrients[key]) ? nutrients[key] * factor : null,
      ]),
    );
  }

  function formatNutrient(key, value) {
    if (!Number.isFinite(value)) {
      return t("notListed");
    }

    const unit = nutrientDefs[key].unit;
    const rounded = key === "calories" || key === "sodium" ? Math.round(value) : roundOne(value);
    return `${rounded}${unit ? ` ${unit}` : ""}`;
  }

  function roundOne(value) {
    return Math.round(value * 10) / 10;
  }

  function prepLabel(prep) {
    const key = `prep${prep.charAt(0).toUpperCase()}${prep.slice(1)}`;
    return t(key) || prep;
  }

  function nutrientLabel(key) {
    return currentTranslations().nutrients?.[key] || nutrientDefs[key]?.label || key;
  }

  function resultCountText(count) {
    return t("resultCount", {
      count,
      plural: count === 1 ? "" : "s",
    });
  }

  function currentTranslations() {
    return translations[state.language] || translations.en;
  }

  function t(key, replacements = {}) {
    const dictionary = currentTranslations();
    const fallback = translations.en;
    let value = dictionary[key] || fallback[key] || "";
    Object.entries(replacements).forEach(([token, replacement]) => {
      value = value.replaceAll(`{${token}}`, String(replacement));
    });
    return value;
  }

  function cleanFoodName(name) {
    const withoutLanguageTags = String(name)
      .split(",")
      .map((part) => part.trim())
      .filter((part) => !/^[a-z]{2}:/i.test(part))
      .join(", ");

    return withoutLanguageTags
      .replace(/\s+/g, " ")
      .replace(/-/g, " ")
      .replace(/, UPC:.*/i, "")
      .replace(/\(.*?not included.*?\)/gi, "")
      .trim();
  }

  function formatFoodTitle(value) {
    const clean = cleanFoodName(value);
    if (state.language !== "en" || /[^\x00-\x7F]/.test(clean)) {
      return clean;
    }
    return titleCase(clean);
  }

  function titleCase(value) {
    return value
      .toLowerCase()
      .split(" ")
      .map((word) => {
        if (word.length <= 2 && !["eg", "or"].includes(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function dedupeResults(results) {
    const seen = new Set();
    return results.filter((item) => {
      const key = `${item.source}-${item.title}-${item.prep}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function sortByPreparationMatch(query) {
    const normalizedQuery = query.toLowerCase();
    return (a, b) => {
      const aExact = a.title.toLowerCase().includes(normalizedQuery) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(normalizedQuery) ? 0 : 1;
      if (aExact !== bExact) {
        return aExact - bExact;
      }
      const prepOrder = ["general", "raw", "boiled", "fried", "baked", "roasted", "grilled", "canned"];
      return prepOrder.indexOf(a.prep) - prepOrder.indexOf(b.prep);
    };
  }

  function setStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", Boolean(isError));
  }
})();
