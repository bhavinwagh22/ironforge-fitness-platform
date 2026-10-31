const Database = require('better-sqlite3');
const db = new Database('gym.db');

const foods = [
  ['Paneer, regular', 'Dairy', 100, 'g', 'raw', 265, 18.3, 1.2, 20.8, 0, 1.2, 13.0, 28, 26, 208, 0.2, 0, 74, 'IFCT 2017', 'IFCT-DAIRY-002'],
  ['Paneer, low-fat', 'Dairy', 100, 'g', 'raw', 170, 22.0, 3.0, 7.0, 0, 2.0, 4.0, 30, 30, 300, 0.3, 0, 60, 'IFCT 2017', 'IFCT-DAIRY-003'],
  ['Paneer, homemade', 'Dairy', 100, 'g', 'raw', 258, 17.5, 1.8, 19.5, 0, 1.6, 12.2, 27, 24, 202, 0.19, 0, 70, 'IFCT 2017', 'IFCT-DAIRY-004'],
  ['Roti / Chapati', 'Breads', 100, 'g', 'cooked', 297, 7.9, 52.0, 4.5, 6.4, 1.0, 0.9, 320, 130, 20, 2.2, 0, 0, 'IFCT 2017', 'IFCT-BREAD-001'],
  ['Phulka', 'Breads', 100, 'g', 'cooked', 241, 6.0, 44.0, 3.5, 5.0, 0.8, 0.7, 250, 100, 15, 1.8, 0, 0, 'IFCT 2017', 'IFCT-BREAD-002'],
  ['Paratha', 'Breads', 100, 'g', 'cooked', 326, 6.0, 42.0, 15.0, 4.0, 1.0, 6.0, 400, 90, 18, 2.0, 0, 0, 'IFCT 2017', 'IFCT-BREAD-003'],
  ['Thepla', 'Breads', 100, 'g', 'cooked', 290, 7.5, 38.0, 12.0, 6.5, 2.0, 3.5, 350, 120, 40, 3.0, 1.0, 0, 'IFCT 2017', 'IFCT-BREAD-004'],
  ['Wheat flour (Atta)', 'Grains', 100, 'g', 'raw', 341, 12.1, 69.4, 1.7, 11.2, 1.0, 0.3, 17, 270, 30, 3.5, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-005'],
  ['Rice, raw, white', 'Grains', 100, 'g', 'raw', 365, 7.1, 80.0, 0.7, 1.3, 0.1, 0.2, 5, 115, 28, 0.8, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-001'],
  ['Rice, cooked, white', 'Grains', 100, 'g', 'cooked', 130, 2.7, 28.2, 0.3, 0.4, 0.05, 0.1, 1, 35, 10, 0.2, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-002'],
  ['Rice, brown, raw', 'Grains', 100, 'g', 'raw', 367, 7.9, 76.2, 2.9, 9.7, 0.7, 0.6, 7, 223, 23, 1.5, 0, 0, 'USDA FoodData Central', '168878'],
  ['Rice, brown, cooked', 'Grains', 100, 'g', 'cooked', 112, 2.6, 23.5, 0.9, 1.8, 0.4, 0.2, 5, 43, 2, 0.4, 0, 0, 'USDA FoodData Central', '168880'],
  ['Dal, cooked (toor/arhar)', 'Legumes', 100, 'g', 'cooked', 107, 7.2, 17.0, 0.4, 7.0, 1.0, 0.1, 2, 365, 30, 1.6, 0.5, 0, 'IFCT 2017', 'IFCT-LEG-001'],
  ['Dal, cooked (moong)', 'Legumes', 100, 'g', 'cooked', 105, 7.0, 18.0, 0.4, 8.0, 1.0, 0.1, 2, 369, 27, 1.4, 1.0, 0, 'IFCT 2017', 'IFCT-LEG-002'],
  ['Dal, cooked (masoor)', 'Legumes', 100, 'g', 'cooked', 116, 9.0, 20.0, 0.4, 7.9, 1.8, 0.1, 2, 384, 25, 4.4, 1.7, 0, 'IFCT 2017', 'IFCT-LEG-003'],
  ['Dal, cooked (urad)', 'Legumes', 100, 'g', 'cooked', 105, 7.4, 17.0, 0.4, 7.5, 0.8, 0.1, 2, 281, 28, 2.6, 0.8, 0, 'IFCT 2017', 'IFCT-LEG-004'],
  ['Dal, raw (moong)', 'Legumes', 100, 'g', 'raw', 339, 23.5, 57.0, 1.2, 16.0, 2.0, 0.3, 28, 1150, 75, 4.4, 8.4, 0, 'IFCT 2017', 'IFCT-LEG-005'],
  ['Rajma, cooked', 'Legumes', 100, 'g', 'cooked', 127, 8.7, 22.8, 0.5, 6.4, 0.3, 0.1, 2, 405, 28, 2.9, 1.2, 0, 'IFCT 2017', 'IFCT-LEG-006'],
  ['Chole, cooked', 'Legumes', 100, 'g', 'cooked', 164, 8.9, 27.4, 2.6, 7.6, 4.8, 0.3, 7, 291, 49, 2.9, 1.3, 0, 'IFCT 2017', 'IFCT-LEG-007'],
  ['Chickpeas, cooked', 'Legumes', 100, 'g', 'cooked', 164, 8.9, 27.4, 2.6, 7.6, 4.8, 0.3, 7, 291, 49, 2.9, 1.3, 0, 'USDA FoodData Central', '164413'],
  ['Soya chunks, dry', 'Legumes', 100, 'g', 'raw', 345, 52.0, 33.0, 0.5, 13.0, 7.0, 0.1, 10, 1797, 350, 20.0, 6.0, 0, 'IFCT 2017', 'IFCT-LEG-008'],
  ['Curd / Dahi', 'Dairy', 100, 'g', 'raw', 60, 3.1, 3.9, 3.0, 0, 3.9, 1.9, 36, 104, 83, 0.05, 0.5, 26, 'IFCT 2017', 'IFCT-DAIRY-005'],
  ['Milk, whole, cow', 'Dairy', 100, 'ml', 'raw', 61, 3.2, 4.8, 3.3, 0, 5.0, 1.9, 44, 132, 113, 0.03, 0, 33, 'IFCT 2017', 'IFCT-DAIRY-006'],
  ['Poha, cooked', 'Grains', 100, 'g', 'cooked', 158, 2.6, 30.0, 4.0, 1.0, 0.5, 0.8, 150, 50, 10, 0.8, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-010'],
  ['Upma, cooked', 'Grains', 100, 'g', 'cooked', 192, 4.0, 26.0, 7.0, 2.0, 1.0, 1.5, 200, 80, 15, 1.2, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-011'],
  ['Khichdi, cooked', 'Grains', 100, 'g', 'cooked', 125, 5.0, 20.0, 2.5, 3.0, 0.5, 0.5, 80, 150, 20, 1.5, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-012'],
  ['Idli', 'Grains', 100, 'g', 'cooked', 39, 1.9, 7.0, 0.1, 0.8, 0.1, 0, 14, 21, 10, 0.4, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-013'],
  ['Dosa', 'Grains', 100, 'g', 'cooked', 168, 3.7, 24.0, 6.0, 1.5, 0.5, 1.0, 120, 70, 15, 1.0, 0, 0, 'IFCT 2017', 'IFCT-GRAIN-014'],
  ['Egg, whole, boiled', 'Eggs', 100, 'g', 'cooked', 155, 12.6, 1.1, 10.6, 0, 1.1, 3.3, 124, 126, 50, 1.8, 0, 149, 'USDA FoodData Central', '171287'],
  ['Egg, raw, whole', 'Eggs', 100, 'g', 'raw', 143, 12.6, 0.7, 9.5, 0, 0.4, 3.1, 142, 138, 56, 1.8, 0, 160, 'USDA FoodData Central', '171287'],
  ['Chicken breast, cooked', 'Meat', 100, 'g', 'cooked', 165, 31.0, 0.0, 3.6, 0, 0, 1.0, 74, 256, 15, 1.0, 0, 5, 'USDA FoodData Central', '171477'],
  ['Chicken breast, raw', 'Meat', 100, 'g', 'raw', 120, 22.5, 0.0, 2.6, 0, 0, 0.7, 45, 334, 5, 0.4, 0, 4, 'USDA FoodData Central', '171477'],
  ['Fish, rohu, cooked', 'Fish', 100, 'g', 'cooked', 97, 16.6, 0, 3.0, 0, 0, 0.7, 54, 300, 50, 1.0, 0, 30, 'IFCT 2017', 'IFCT-FISH-001'],
  ['Banana, raw', 'Fruits', 100, 'g', 'raw', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 0.1, 1, 358, 5, 0.26, 8.7, 3, 'USDA FoodData Central', '173944'],
  ['Potato, boiled', 'Vegetables', 100, 'g', 'cooked', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 0, 4, 379, 5, 0.3, 12.6, 0, 'USDA FoodData Central', '170032'],
  ['Tomato, raw', 'Vegetables', 100, 'g', 'raw', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 0, 5, 237, 10, 0.3, 13.7, 42, 'USDA FoodData Central', '170457'],
  ['Onion, raw', 'Vegetables', 100, 'g', 'raw', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 0, 4, 146, 23, 0.2, 7.4, 0, 'USDA FoodData Central', '170000'],
  ['Peanuts, raw', 'Nuts', 100, 'g', 'raw', 567, 25.8, 16.1, 49.2, 8.5, 4.7, 6.3, 18, 705, 92, 4.6, 0, 0, 'USDA FoodData Central', '172432'],
  ['Almonds, raw', 'Nuts', 100, 'g', 'raw', 579, 21.2, 21.7, 49.9, 12.5, 4.3, 3.8, 1, 733, 269, 3.7, 0, 0, 'USDA FoodData Central', '170567'],
];

const insert = db.prepare(`INSERT OR IGNORE INTO foods
(food_name,category,serving_size,serving_unit,raw_or_cooked,calories,protein,carbohydrates,total_fat,dietary_fiber,sugar,saturated_fat,sodium,potassium,calcium,iron,vitamin_c,vitamin_a,data_source,source_reference_id)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const tx = db.transaction(rows => { for (const r of rows) insert.run(...r); });
tx(foods);
console.log('Seeded', foods.length, 'Indian foods');
console.log('Total:', db.prepare('SELECT COUNT(*) as c FROM foods').get().c);
db.close();
EOF
cd server && NODE_PATH=./node_modules node seed-indian-foods.js && rm seed-indian-foods.js