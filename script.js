(function () {
  "use strict";

  const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
  const USDA_KEY_STORAGE = "nourish-search-usda-key";
  const MEAL_STORAGE = "nourish-search-meal";
  const TARGET_STORAGE = "nourish-search-target";
  const TARGET_GOALS_STORAGE = "nourish-search-target-goals";

  const nutrientDefs = {
    calories: {
      label: "Calories",
      unit: "",
      usdaNames: ["Energy"],
      aliases: ["calorie", "calories", "kcal", "energy"],
      high: 700,
      low: 300,
    },
    protein: {
      label: "Protein",
      unit: "g",
      usdaNames: ["Protein"],
      aliases: ["protein"],
      high: 20,
      low: 5,
    },
    fiber: {
      label: "Fiber",
      unit: "g",
      usdaNames: ["Fiber, total dietary"],
      aliases: ["fiber", "fibre"],
      high: 5,
      low: 2,
    },
    carbs: {
      label: "Carbs",
      unit: "g",
      usdaNames: ["Carbohydrate, by difference", "Carbohydrate, by summation"],
      aliases: ["carb", "carbs", "carbohydrate", "carbohydrates"],
      high: 60,
      low: 15,
    },
    fat: {
      label: "Fat",
      unit: "g",
      usdaNames: ["Total lipid (fat)", "Total Fat"],
      aliases: ["fat", "fats"],
      high: 25,
      low: 5,
    },
    sugar: {
      label: "Sugar",
      unit: "g",
      usdaNames: ["Sugars, total including NLEA", "Sugars, total"],
      aliases: ["sugar", "sugars"],
      high: 20,
      low: 5,
    },
    sodium: {
      label: "Sodium",
      unit: "mg",
      usdaNames: ["Sodium, Na"],
      aliases: ["sodium", "salt"],
      high: 600,
      low: 140,
    },
  };

  const defaultDailyTargets = {
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

  const prepKeywords = {
    raw: ["raw", "uncooked", "fresh"],
    boiled: ["boiled", "hard cooked", "hard-cooked", "poached", "steamed"],
    fried: ["fried", "pan fried", "scrambled", "omelet", "omelette", "sauteed"],
    baked: ["baked", "casserole"],
    roasted: ["roasted", "roast"],
    grilled: ["grilled", "broiled", "barbecue"],
    canned: ["canned", "packed in", "drained"],
  };

  const commonSearchFallbacks = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snack",
    dessert: "dessert",
  };

  const uiText = {
    skipLink: "Skip to results",
    brandTagline: "Nutrition-first food lookup",
    pageSections: "Page sections",
    navSearch: "Search",
    navMeal: "Meal Calculator",
    navSources: "Sources",
    languageLabel: "Language",
    heroEyebrow: "USDA FoodData Central",
    heroTitle: "Find clear nutrition facts by food, serving, and cooking style.",
    heroCopy:
      "Search USDA food records, filter by nutrient goals, and add ingredients to a meal without brand listings or price noise.",
    foodName: "Food name",
    searchPlaceholder: "Try eggs, chicken, oatmeal, rice...",
    searchButton: "Search",
    filterTitle: "Nutrient filters",
    filterNutrient: "Nutrient",
    filterOperator: "Goal",
    filterAmount: "Amount",
    filterAtMost: "At most",
    filterAtLeast: "At least",
    addFilter: "Add filter",
    clearFilters: "Clear filters",
    noFilters: "No nutrient filters active.",
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
    resultsEyebrow: "USDA Food Database",
    resultsTitle: "Search results",
    readyToSearch: "Ready to search.",
    searching: 'Searching USDA nutrition records for "{query}"...',
    noResults: "No USDA nutrition records matched. Try a broader food name or looser nutrient filters.",
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
      "Results come from USDA FoodData Central and normalize nutrition per selected serving grams. Cooking style is inferred from USDA descriptions and categories. Nutrient filters are applied to USDA records after search.",
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
    nutritionPer100: "Nutrition values per 100 g.",
    customTargets: "Custom daily goals",
    saveTargets: "Save goals",
    resetTargets: "Reset",
    activeFilters: "Active filters",
  };

  const state = {
    allResults: [],
    mealItems: loadMeal(),
    activePrep: "all",
    lastQuery: "",
    lastParsedSearch: null,
    targetMode: localStorage.getItem(TARGET_STORAGE) || "meal",
    targetGoals: loadTargetGoals(),
    filters: [],
  };

  const form = document.querySelector("#food-search-form");
  const queryInput = document.querySelector("#food-query");
  const searchButton = document.querySelector("#search-button");
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
  const targetModeSelect = document.querySelector("#target-mode");
  const filterNutrientSelect = document.querySelector("#filter-nutrient");
  const filterOperatorSelect = document.querySelector("#filter-operator");
  const filterValueInput = document.querySelector("#filter-value");
  const addFilterButton = document.querySelector("#add-filter");
  const clearFiltersButton = document.querySelector("#clear-filters");
  const activeFilters = document.querySelector("#active-filters");

  initialize();

  function initialize() {
    applyStaticText();
    targetModeSelect.value = state.targetMode;
    form.addEventListener("submit", handleSearch);
    searchButton.addEventListener("click", handleSearch);
    queryInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handleSearch(event);
      }
    });
    saveKeyButton.addEventListener("click", saveKey);
    servingInput.addEventListener("change", syncServingInputs);
    addFilterButton.addEventListener("click", addNutrientFilter);
    clearFiltersButton.addEventListener("click", clearNutrientFilters);
    filterValueInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addNutrientFilter();
      }
    });
    document.querySelector("#clear-meal").addEventListener("click", clearMeal);
    targetModeSelect.addEventListener("change", changeTargetMode);

    prepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        prepButtons.forEach((chip) => chip.classList.remove("active"));
        button.classList.add("active");
        state.activePrep = button.dataset.prep;
        renderResults();
      });
    });

    buildTargetEditor();
    buildFilterOptions();
    renderActiveFilters();
    const storedKey = localStorage.getItem(USDA_KEY_STORAGE);
    if (storedKey) {
      keyInput.value = storedKey;
      keyStatus.textContent = uiText.usdaKeySaved;
    }
    setStatus(uiText.readyToSearch, false);
    renderMeal();
  }

  async function handleSearch(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const query = queryInput.value.trim();
    if (!query) {
      return;
    }
    await runSearch(query);
  }

  function buildFilterOptions() {
    filterNutrientSelect.innerHTML = "";
    Object.entries(nutrientDefs).forEach(([key, def]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${def.label}${def.unit ? ` (${def.unit})` : " (kcal)"}`;
      filterNutrientSelect.append(option);
    });
  }

  function addNutrientFilter() {
    const key = filterNutrientSelect.value;
    const operator = filterOperatorSelect.value === "min" ? "min" : "max";
    const value = Number(filterValueInput.value);
    if (!nutrientDefs[key] || !Number.isFinite(value) || value < 0) {
      filterValueInput.focus();
      return;
    }

    const existing = state.filters.find((filter) => filter.key === key && filter.operator === operator);
    const nextFilter = {
      key,
      operator,
      value,
      label: filterLabel({ key, operator, value }),
    };
    if (existing) {
      Object.assign(existing, nextFilter);
    } else {
      state.filters.push(nextFilter);
    }

    filterValueInput.value = "";
    renderActiveFilters();
    rerunSearchIfReady();
  }

  function clearNutrientFilters() {
    state.filters = [];
    renderActiveFilters();
    rerunSearchIfReady();
  }

  function removeNutrientFilter(index) {
    state.filters.splice(index, 1);
    renderActiveFilters();
    rerunSearchIfReady();
  }

  function renderActiveFilters() {
    activeFilters.innerHTML = "";
    if (!state.filters.length) {
      activeFilters.textContent = uiText.noFilters;
      return;
    }

    state.filters.forEach((filter, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.textContent = `${filter.label} x`;
      chip.setAttribute("aria-label", `Remove ${filter.label}`);
      chip.addEventListener("click", () => removeNutrientFilter(index));
      activeFilters.append(chip);
    });
  }

  function rerunSearchIfReady() {
    if (state.lastQuery) {
      runSearch(state.lastQuery);
    }
  }

  async function runSearch(query) {
    state.lastQuery = query;
    state.lastParsedSearch = parseAdvancedSearch(query);
    state.allResults = [];
    resultsGrid.innerHTML = "";
    setStatus(formatText(uiText.searching, { query }), false);
    resultCount.textContent = `${uiText.searchButton}...`;

    try {
      const results = await searchUsda(state.lastParsedSearch);
      state.allResults = results.sort(sortByAdvancedSearch(state.lastParsedSearch));
      renderResults();

      if (!state.allResults.length) {
        setStatus(uiText.noResults, true);
      } else {
        setStatus(searchSummaryText(state.lastParsedSearch), false);
      }
    } catch (error) {
      setStatus(error.message || uiText.searchFailed, true);
      resultCount.textContent = resultCountText(0);
    }
  }

  async function searchUsda(parsedSearch) {
    const apiKey = keyInput.value.trim() || localStorage.getItem(USDA_KEY_STORAGE);
    if (!apiKey) {
      throw new Error(uiText.usdaKeyMissing);
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      query: parsedSearch.usdaQuery,
      pageSize: "50",
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
        query: parsedSearch.usdaQuery,
        pageSize: "50",
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
      .filter((item) => matchesAdvancedFilters(item, parsedSearch))
      .slice(0, 30);
  }

  function normalizeUsdaFood(food) {
    const nutrients = {};
    Object.entries(nutrientDefs).forEach(([key, def]) => {
      nutrients[key] = readUsdaNutrient(food.foodNutrients || [], def);
    });
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

  function parseAdvancedSearch(query) {
    const original = query.trim();
    let working = ` ${original.toLowerCase()} `;
    const tags = [];

    Object.entries(commonSearchFallbacks).forEach(([word, searchTerm]) => {
      if (working.includes(` ${word} `)) {
        tags.push(word);
        working = working.replace(new RegExp(`\\b${word}\\b`, "g"), ` ${searchTerm} `);
      }
    });

    working = working.replace(/\b(food|foods|idea|ideas|option|options|show me|find|with|and|that are|for)\b/g, " ");
    working = working.replace(/\s+/g, " ").trim();

    let usdaQuery = working || tags.map((tag) => commonSearchFallbacks[tag]).join(" ") || original;
    if (/^(food|foods|idea|ideas)$/i.test(usdaQuery)) {
      usdaQuery = "meal";
    }

    return {
      original,
      usdaQuery,
      filters: state.filters.map((filter) => ({ ...filter, label: filterLabel(filter) })),
      tags,
    };
  }

  function matchesAdvancedFilters(item, parsedSearch) {
    if (!parsedSearch.filters.length) {
      return true;
    }
    return parsedSearch.filters.every((filter) => {
      const value = item.nutrients[filter.key];
      if (!Number.isFinite(value)) {
        return false;
      }
      return filter.operator === "max" ? value <= filter.value : value >= filter.value;
    });
  }

  function sortByAdvancedSearch(parsedSearch) {
    return (a, b) => {
      const aScore = resultScore(a, parsedSearch);
      const bScore = resultScore(b, parsedSearch);
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return a.title.localeCompare(b.title);
    };
  }

  function resultScore(item, parsedSearch) {
    let score = item.title.toLowerCase().includes(parsedSearch.usdaQuery.toLowerCase()) ? 10 : 0;
    parsedSearch.filters.forEach((filter) => {
      const value = item.nutrients[filter.key];
      if (!Number.isFinite(value)) {
        return;
      }
      if (filter.operator === "max") {
        score += Math.max(0, filter.value - value) / Math.max(1, filter.value);
      } else {
        score += value / Math.max(1, filter.value);
      }
    });
    return score;
  }

  function searchSummaryText(parsedSearch) {
    const parts = [`USDA query: "${parsedSearch.usdaQuery}"`];
    if (parsedSearch.filters.length) {
      parts.push(`${uiText.activeFilters}: ${parsedSearch.filters.map((filter) => filter.label).join(", ")}`);
    }
    return parts.join(" - ");
  }

  function readUsdaNutrient(foodNutrients, def) {
    const match = foodNutrients.find((entry) => {
      const name = (entry.nutrientName || entry.nutrient?.name || "").toLowerCase();
      return def.usdaNames.some((candidate) => name === candidate.toLowerCase());
    });
    const value = Number(match?.value ?? match?.amount);
    return Number.isFinite(value) ? value : null;
  }

  function hasUsefulNutrients(nutrients) {
    return Object.values(nutrients).some((value) => Number.isFinite(value) && value > 0);
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
      setStatus(formatText(uiText.noPrep, { prep: prepLabel(state.activePrep).toLowerCase() }), true);
      return;
    }

    filtered.forEach((item) => {
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.id = item.id;
      card.querySelector("h3").textContent = item.title;
      card.querySelector(".result-meta").textContent = item.meta || uiText.nutritionPer100;

      const sourcePill = card.querySelector(".source-pill");
      sourcePill.textContent = item.source;
      sourcePill.classList.add(item.sourceClass);
      card.querySelector(".prep-pill").textContent = prepLabel(item.prep);
      card.querySelector(".add-button").textContent = uiText.addToMeal;

      const servingControl = card.querySelector(".card-serving");
      servingControl.value = servingGrams;
      servingControl.addEventListener("change", () => renderCardNutrition(card, item));
      card.querySelector(".add-button").addEventListener("click", () => {
        addMealItem(item, clampServing(Number(servingControl.value)));
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
      empty.textContent = uiText.emptyMeal;
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
        remove.setAttribute("aria-label", formatText(uiText.removeItem, { title: item.title }));
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

  function buildTargetEditor() {
    const existing = document.querySelector("#custom-targets");
    if (existing) {
      existing.remove();
    }

    const panel = document.createElement("details");
    panel.id = "custom-targets";
    panel.className = "custom-targets";
    panel.innerHTML = `
      <summary>${uiText.customTargets}</summary>
      <div class="target-grid"></div>
      <div class="target-actions">
        <button type="button" class="secondary-button" id="save-targets">${uiText.saveTargets}</button>
        <button type="button" class="secondary-button" id="reset-targets">${uiText.resetTargets}</button>
      </div>
    `;

    const grid = panel.querySelector(".target-grid");
    Object.entries(nutrientDefs).forEach(([key, def]) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <span>${def.label}</span>
        <div class="input-with-unit small">
          <input data-target-input="${key}" type="number" min="0" step="${key === "calories" || key === "sodium" ? "1" : "0.1"}" value="${state.targetGoals[key]}">
          <span>${def.unit || "kcal"}</span>
        </div>
      `;
      grid.append(label);
    });

    document.querySelector(".target-control").insertAdjacentElement("afterend", panel);
    panel.querySelector("#save-targets").addEventListener("click", saveTargetGoals);
    panel.querySelector("#reset-targets").addEventListener("click", resetTargetGoals);
  }

  function saveTargetGoals() {
    document.querySelectorAll("[data-target-input]").forEach((input) => {
      const key = input.dataset.targetInput;
      const value = Number(input.value);
      state.targetGoals[key] = Number.isFinite(value) && value >= 0 ? value : defaultDailyTargets[key];
    });
    localStorage.setItem(TARGET_GOALS_STORAGE, JSON.stringify(state.targetGoals));
    renderMeal();
  }

  function resetTargetGoals() {
    state.targetGoals = { ...defaultDailyTargets };
    localStorage.setItem(TARGET_GOALS_STORAGE, JSON.stringify(state.targetGoals));
    buildTargetEditor();
    renderMeal();
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
    badge.textContent = state.mealItems.length ? measureLabel(status) : uiText.measureEmpty;
    targetText.textContent = formatText(uiText.targetValue, { value: formatNutrient(key, target) });
    fill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
    measure.setAttribute(
      "aria-label",
      `${nutrientDefs[key].label}: ${formatText(uiText.targetShort, { percent: Math.round(ratio * 100) })}`,
    );
  }

  function nutrientTarget(key) {
    return state.targetGoals[key] * (targetModes[state.targetMode] || targetModes.meal);
  }

  function measureStatus(ratio) {
    if (ratio < 0.75) return "low";
    if (ratio > 1.2) return "high";
    return "ok";
  }

  function measureLabel(status) {
    if (status === "low") return uiText.measureLow;
    if (status === "high") return uiText.measureHigh;
    return uiText.measureOk;
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
      keyStatus.textContent = uiText.usdaKeyRemoved;
      return;
    }
    localStorage.setItem(USDA_KEY_STORAGE, key);
    keyStatus.textContent = uiText.usdaKeySaved;
  }

  function changeTargetMode() {
    state.targetMode = targetModeSelect.value || "meal";
    localStorage.setItem(TARGET_STORAGE, state.targetMode);
    renderMeal();
  }

  function applyStaticText() {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (uiText[key]) {
        element.textContent = uiText[key];
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      if (uiText[key]) {
        element.setAttribute("placeholder", uiText[key]);
      }
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset.i18nAriaLabel;
      if (uiText[key]) {
        element.setAttribute("aria-label", uiText[key]);
      }
    });
    document.querySelectorAll("[data-nutrient-label]").forEach((element) => {
      const key = element.dataset.nutrientLabel;
      if (nutrientDefs[key]) {
        element.textContent = nutrientDefs[key].label;
      }
    });
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

  function loadTargetGoals() {
    try {
      return { ...defaultDailyTargets, ...JSON.parse(localStorage.getItem(TARGET_GOALS_STORAGE) || "{}") };
    } catch {
      return { ...defaultDailyTargets };
    }
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

  function filterLabel(filter) {
    const def = nutrientDefs[filter.key];
    if (!def) {
      return "";
    }
    const operatorText = filter.operator === "min" ? uiText.filterAtLeast.toLowerCase() : uiText.filterAtMost.toLowerCase();
    return `${def.label} ${operatorText} ${formatNutrient(filter.key, filter.value)}`;
  }

  function formatNutrient(key, value) {
    if (!Number.isFinite(value)) {
      return uiText.notListed;
    }
    const unit = nutrientDefs[key].unit;
    const rounded = key === "calories" || key === "sodium" ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded}${unit ? ` ${unit}` : ""}`;
  }

  function prepLabel(prep) {
    if (prep === "general") {
      return uiText.prepGeneral;
    }
    const key = `prep${prep.charAt(0).toUpperCase()}${prep.slice(1)}`;
    return uiText[key] || prep;
  }

  function resultCountText(count) {
    return formatText(uiText.resultCount, { count, plural: count === 1 ? "" : "s" });
  }

  function formatText(text, replacements = {}) {
    let value = text;
    Object.entries(replacements).forEach(([token, replacement]) => {
      value = value.replaceAll(`{${token}}`, String(replacement));
    });
    return value;
  }

  function cleanFoodName(name) {
    return String(name)
      .replace(/\s+/g, " ")
      .replace(/-/g, " ")
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

  function setStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", Boolean(isError));
  }
})();
