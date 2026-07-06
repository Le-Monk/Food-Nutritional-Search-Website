# Nourish Search

Nourish Search is a lightweight nutritional food search website that combines generic USDA FoodData Central results with Open Food Facts nutrition records. It avoids product pricing and brand-forward shopping patterns, focusing instead on serving size, preparation style, and meal-level nutrient totals.

## Features

- Search foods such as eggs, rice, apple, chicken, or yogurt.
- Compare nutrition from USDA and Open Food Facts in one accessible result grid.
- Filter by preparation style such as raw, boiled, fried, baked, roasted, grilled, or canned.
- Adjust serving size per item and see calories, protein, fiber, carbohydrates, fat, sugar, and sodium recalculated.
- Add foods to a meal calculator and sum nutrition for the whole menu.
- Compare meal totals against snack, single-meal, or full-day nutrition targets, with low, in-range, and high guidance for every nutrient category.
- Switch the website language. English is the default, with Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Russian, Portuguese, and Urdu also available.
- Translate Open Food Facts product names through a DeepL proxy when the site is deployed with a `DEEPL_API_KEY` environment variable.
- Save a USDA API key locally in the browser without committing it to the repository.

## Data Sources

- USDA FoodData Central API for generic food composition records.
- Open Food Facts API for open packaged-food nutrition records.

USDA data is public domain. Open Food Facts data is made available under the Open Database License, with individual database contents under the Database Contents License. Nutrition data can be incomplete or vary by source, preparation, and serving assumptions.

## Running Locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

The app does not commit USDA API keys. Use the API key field in the page to save a key to `localStorage` for your browser session.

Nutrition target guidance is an estimate based on common daily nutrition reference values and scaled for the selected target type. It is informational and not medical advice.

## DeepL Translation Proxy

DeepL does not allow browser-only calls because that would expose the API key. This repo includes a Netlify function at `netlify/functions/deepl-translate.js`. To enable product-name translation, deploy with:

```bash
DEEPL_API_KEY=your_deepl_key
```

The frontend calls `/api/deepl-translate` and falls back to local food-phrase cleanup if the proxy is unavailable.
