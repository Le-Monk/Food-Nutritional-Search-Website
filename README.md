# Nourish Search

Nourish Search is a lightweight nutritional food search website that uses generic USDA FoodData Central records. It avoids product pricing and brand-forward shopping patterns, focusing instead on serving size, preparation style, advanced nutrient searches, and meal-level nutrient totals.

## Features

- Search foods such as eggs, rice, apple, chicken, or yogurt.
- Search USDA FoodData Central records in one accessible result grid.
- Filter by preparation style such as raw, boiled, fried, baked, roasted, grilled, or canned.
- Adjust serving size per item and see calories, protein, fiber, carbohydrates, fat, sugar, and sodium recalculated.
- Add foods to a meal calculator and sum nutrition for the whole menu.
- Compare meal totals against snack, single-meal, or full-day nutrition targets, with low, in-range, and high guidance for every nutrient category.
- Customize the daily target goals used by the meal calculator.
- Use advanced searches such as `foods under 300 calories`, `high fiber breakfast ideas`, `low sodium lunch`, or `protein over 20g`.
- Save a USDA API key locally in the browser without committing it to the repository.

## Data Sources

- USDA FoodData Central API for generic food composition records.

USDA data is public domain. Nutrition data can be incomplete or vary by source, preparation, and serving assumptions.

## Running Locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

The app does not commit USDA API keys. Use the API key field in the page to save a key to `localStorage` for your browser session.

Nutrition target guidance is an estimate based on editable daily nutrition reference values and scaled for the selected target type. It is informational and not medical advice.
