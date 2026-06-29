# Nourish Search

Nourish Search is a lightweight nutritional food search website that combines generic USDA FoodData Central results with Open Food Facts nutrition records. It avoids product pricing and brand-forward shopping patterns, focusing instead on serving size, preparation style, and meal-level nutrient totals.

## Features

- Search foods such as eggs, rice, apple, chicken, or yogurt.
- Compare nutrition from USDA and Open Food Facts in one accessible result grid.
- Filter by preparation style such as raw, boiled, fried, baked, roasted, grilled, or canned.
- Adjust serving size per item and see calories, protein, fiber, carbohydrates, fat, sugar, and sodium recalculated.
- Add foods to a meal calculator and sum nutrition for the whole menu.
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
