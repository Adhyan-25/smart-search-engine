/**
 * Database seeding script. Run: npm run seed [-- --count=50000]
 * Generates synthetic but realistic product data for search/benchmark use.
 */
const mongoose = require('mongoose');
const { config } = require('../src/config');
const Product = require('../src/models/Product');

const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Clothing', 'Sports', 'Toys', 'Beauty', 'Automotive'];
const BRANDS = ['Aster', 'Nova', 'Orbit', 'Quantum', 'Pulse', 'Vertex', 'Halo', 'Zenith'];
const PRODUCT_NOUNS = {
  Electronics: ['Phone', 'Case', 'Charger', 'Headphones', 'Speaker', 'Watch', 'Camera', 'Monitor', 'Keyboard', 'Mouse'],
  'Home & Kitchen': ['Blender', 'Chair', 'Desk Lamp', 'Coffee Maker', 'Cookware Set', 'Air Fryer'],
  Books: ['Notebook', 'Novel', 'Cookbook', 'Textbook', 'Journal', 'Biography'],
  Clothing: ['Sneakers', 'Jacket', 'T-Shirt', 'Jeans', 'Hoodie', 'Backpack'],
  Sports: ['Water Bottle', 'Yoga Mat', 'Dumbbells', 'Football', 'Tennis Racket', 'Running Shoes'],
  Toys: ['Building Blocks', 'Puzzle', 'Action Figure', 'Doll', 'Toy Car', 'Board Game'],
  Beauty: ['Lipstick', 'Face Serum', 'Shampoo', 'Perfume', 'Moisturizer', 'Hair Dryer'],
  Automotive: ['Car Charger', 'Tire Inflator', 'Dash Cam', 'Car Mount', 'Seat Cover', 'Jump Starter'],
};
const ADJECTIVES = ['Pro', 'Max', 'Lite', 'Mini', 'Plus', 'Ultra', '2024', 'Classic', 'Wireless', 'Smart'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function generateProduct(i) {
  const brand = pick(BRANDS);
  const category = pick(CATEGORIES);
  const noun = pick(PRODUCT_NOUNS[category]);
  const adj = Math.random() > 0.4 ? ` ${pick(ADJECTIVES)}` : '';
  const title = `${brand} ${noun}${adj}`;
  const keywords = [brand.toLowerCase(), noun.toLowerCase(), category.toLowerCase()];

  return {
    title,
    description: `${title} - a ${category.toLowerCase()} product from ${brand}. Item #${i}.`,
    category,
    price: +(Math.random() * 500 + 5).toFixed(2),
    rating: +(Math.random() * 5).toFixed(1),
    popularity: Math.floor(Math.random() ** 2 * 10000), // skewed: most low, some viral
    keywords,
  };
}

async function seed() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 20000;

  await mongoose.connect(config.mongoUri);
  console.log(`[seed] Connected to ${config.mongoUri}`);

  await Product.deleteMany({});
  console.log('[seed] Cleared existing products');

  const BATCH_SIZE = 1000;
  let inserted = 0;
  for (let start = 0; start < count; start += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - start);
    const batch = Array.from({ length: batchSize }, (_, j) => generateProduct(start + j));
    await Product.insertMany(batch);
    inserted += batch.length;
    process.stdout.write(`\r[seed] Inserted ${inserted}/${count}`);
  }
  console.log(`\n[seed] Done. ${inserted} products inserted.`);

  await mongoose.connection.close();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { seed, generateProduct };
