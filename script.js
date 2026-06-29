(function () {
  "use strict";

  const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
  const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/search";
  const USDA_KEY_STORAGE = "nourish-search-usda-key";
  const MEAL_STORAGE = "nourish-search-meal";

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

  const state = {
    allResults: [],
    mealItems: loadMeal(),
    activePrep: "all",
    lastQuery: "",
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

  initialize();

  function initialize() {
    const storedKey = localStorage.getItem(USDA_KEY_STORAGE);
    if (storedKey) {
      keyInput.value = storedKey;
      keyStatus.textContent = "USDA key saved in this browser.";
    }

    form.addEventListener("submit", handleSearch);
    saveKeyButton.addEventListener("click", saveKey);
    servingInput.addEventListener("change", syncServingInputs);
    document.querySelector("#clear-meal").addEventListener("click", clearMeal);

    prepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        prepButtons.forEach((chip) => chip.classList.remove("active"));
        button.classList.add("active");
        state.activePrep = button.dataset.prep;
        renderResults();
      });
    });

    renderMeal();
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (!query) {
      return;
    }

    state.lastQuery = query;
    state.allResults = [];
    resultsGrid.innerHTML = "";
    setStatus(`Searching nutrition databases for "${query}"...`, false);
    resultCount.textContent = "Searching...";

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
        setStatus(
          `Some sources could not be loaded: ${errors.join(" ")} Showing available results.`,
          true,
        );
      } else if (!state.allResults.length) {
        setStatus("No nutrition records found. Try a broader food name such as egg or rice.", true);
      } else {
        setStatus("");
      }
    } catch (error) {
      setStatus(error.message || "Search failed. Please try again.", true);
      resultCount.textContent = "No results";
    }
  }

  async function searchUsda(query) {
    const apiKey = keyInput.value.trim() || localStorage.getItem(USDA_KEY_STORAGE);
    if (!apiKey) {
      throw new Error("Add a USDA API key to include FoodData Central records.");
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
    const params = new URLSearchParams({
      search_terms: query,
      page_size: "18",
      fields:
        "code,product_name,generic_name,categories,quantity,serving_size,nutriments,nutriscore_grade,nova_group",
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
        fields:
          "code,product_name,generic_name,categories,quantity,serving_size,nutriments,nutriscore_grade,nova_group",
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

    return products
      .filter((product) => productMatchesQuery(product, query))
      .map(normalizeOpenFoodFactsFood)
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
      meta: [food.dataType, food.foodCategory].filter(Boolean).join(" • "),
      baseGrams: 100,
      nutrients,
    };
  }

  function normalizeOpenFoodFactsFood(product) {
    const nutriments = product.nutriments || {};
    const nutrients = {};
    for (const [key, def] of Object.entries(nutrientDefs)) {
      nutrients[key] = readOpenFoodFactsNutrient(nutriments, def);
    }

    if (!hasUsefulNutrients(nutrients)) {
      return null;
    }

    const name = product.generic_name || product.product_name || product.categories || "Packaged food";
    const prep = inferPreparation([name, product.categories]);
    const metaParts = ["Open packaged-food record"];
    if (product.quantity) {
      metaParts.push(product.quantity);
    }
    if (product.serving_size) {
      metaParts.push(`listed serving: ${product.serving_size}`);
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
      title: titleCase(cleanFoodName(name)),
      prep,
      meta: metaParts.join(" • "),
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

  function productMatchesQuery(product, query) {
    const needle = normalizeSearchTerm(query);
    const haystack = normalizeSearchTerm(
      [product.generic_name, product.product_name, product.categories].filter(Boolean).join(" "),
    );

    return needle
      .split(" ")
      .filter(Boolean)
      .some((term) => haystack.includes(term));
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
    resultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length && state.allResults.length) {
      setStatus(`No ${state.activePrep} records found for this search. Try All preparations.`, true);
      return;
    }

    if (state.allResults.length && statusMessage.textContent.startsWith("No ")) {
      setStatus("");
    }

    filtered.forEach((item) => {
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.id = item.id;
      card.querySelector("h3").textContent = item.title;
      card.querySelector(".result-meta").textContent = item.meta || "Nutrition values per 100 g.";

      const sourcePill = card.querySelector(".source-pill");
      sourcePill.textContent = item.source;
      sourcePill.classList.add(item.sourceClass);

      card.querySelector(".prep-pill").textContent = prepLabel(item.prep);

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
      term.textContent = def.label;
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
      empty.textContent = "Add ingredients from the search results to start a meal total.";
      mealItems.append(empty);
    } else {
      state.mealItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "meal-item";

        const text = document.createElement("div");
        const title = document.createElement("strong");
        const meta = document.createElement("small");
        title.textContent = item.title;
        meta.textContent = `${item.grams} g • ${prepLabel(item.prep)} • ${item.source}`;
        text.append(title, meta);

        const remove = document.createElement("button");
        remove.className = "remove-meal-item";
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${item.title}`);
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
      const target = document.querySelector(`[data-total="${key}"]`);
      if (target) {
        target.textContent = formatNutrient(key, totals[key]);
      }
    });
  }

  function calculateTotals() {
    return state.mealItems.reduce((totals, item) => {
      Object.keys(nutrientDefs).forEach((key) => {
        totals[key] = (totals[key] || 0) + (Number(item.nutrients[key]) || 0);
      });
      return totals;
    }, {});
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
      keyStatus.textContent = "USDA key removed from this browser.";
      return;
    }
    localStorage.setItem(USDA_KEY_STORAGE, key);
    keyStatus.textContent = "USDA key saved in this browser.";
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
      return "Not listed";
    }

    const unit = nutrientDefs[key].unit;
    const rounded = key === "calories" || key === "sodium" ? Math.round(value) : roundOne(value);
    return `${rounded}${unit ? ` ${unit}` : ""}`;
  }

  function roundOne(value) {
    return Math.round(value * 10) / 10;
  }

  function prepLabel(prep) {
    return prep === "general" ? "General" : prep.charAt(0).toUpperCase() + prep.slice(1);
  }

  function cleanFoodName(name) {
    return String(name)
      .replace(/\s+/g, " ")
      .replace(/, UPC:.*/i, "")
      .replace(/\(.*?not included.*?\)/gi, "")
      .trim();
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
