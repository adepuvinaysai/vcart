const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'db.json');
const INITIAL_DATA = {
  users: [],
  products: [],
  orders: [],
  orderItems: []
};

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    saveDb(INITIAL_DATA);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Unable to parse database file:', error);
    saveDb(INITIAL_DATA);
    return { ...INITIAL_DATA };
  }
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function ensureSeedData() {
  const db = loadDb();
  let changed = false;

  if (!db.products || !db.products.length) {
    db.products = [
      {
        id: 'prod_1',
        name: 'Classic Sneakers',
        description: 'Breathable mesh sneakers designed for comfort and street style.',
        category: 'Fashion',
        rating: 4.7,
        reviews: 892,
        price: 6500,
        originalPrice: 8500,
        offer: '25% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1519741494944-55d4b4be4ab3?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'prod_2',
        name: 'Leather Wallet',
        description: 'Slim RFID-safe wallet with premium leather finish and organized pockets.',
        category: 'Fashion',
        rating: 4.5,
        reviews: 540,
        price: 3400,
        originalPrice: 4300,
        offer: '20% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'prod_3',
        name: 'Wireless Headphones',
        description: 'Noise-canceling over-ear headphones with long battery life.',
        category: 'Electronics',
        rating: 4.8,
        reviews: 1240,
        price: 12900,
        originalPrice: 15900,
        offer: '19% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1516728778615-2d590ea1856f?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'prod_4',
        name: 'Smartwatch Pro',
        description: 'Stay connected with activity tracking, notifications, and premium style.',
        category: 'Electronics',
        rating: 4.6,
        reviews: 760,
        price: 9800,
        originalPrice: 12500,
        offer: '22% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1519861530954-9b0c5228d00e?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'prod_5',
        name: 'Home Office Lamp',
        description: 'Elegant LED desk lamp with adjustable brightness and USB charging port.',
        category: 'Home & Living',
        rating: 4.4,
        reviews: 320,
        price: 3900,
        originalPrice: 5200,
        offer: '25% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'prod_6',
        name: 'Travel Backpack',
        description: 'Water-resistant carry backpack with laptop sleeve and multiple storage pockets.',
        category: 'Travel',
        rating: 4.7,
        reviews: 650,
        price: 7200,
        originalPrice: 9000,
        offer: '20% off',
        currency: 'usd',
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80'
      }
    ];
    changed = true;
  }

  if (!db.users || !db.users.length) {
    db.users = [
      {
        id: crypto.randomUUID(),
        name: 'Admin',
        email: 'admin@example.com',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    changed = true;
  }

  if (changed) {
    saveDb(db);
  }
}

function getAllProducts() {
  return loadDb().products;
}

function getProductById(id) {
  return loadDb().products.find((product) => product.id === id);
}

function createProduct(product) {
  const db = loadDb();
  const newProduct = { ...product, id: crypto.randomUUID() };
  db.products.push(newProduct);
  saveDb(db);
  return newProduct;
}

function updateProduct(id, updates) {
  const db = loadDb();
  const itemIndex = db.products.findIndex((product) => product.id === id);
  if (itemIndex === -1) return null;
  db.products[itemIndex] = { ...db.products[itemIndex], ...updates };
  saveDb(db);
  return db.products[itemIndex];
}

function deleteProduct(id) {
  const db = loadDb();
  const itemIndex = db.products.findIndex((product) => product.id === id);
  if (itemIndex === -1) return false;
  db.products.splice(itemIndex, 1);
  saveDb(db);
  return true;
}

function getUserByEmail(email) {
  return loadDb().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function getUserById(id) {
  return loadDb().users.find((user) => user.id === id);
}

function createUser(user) {
  const db = loadDb();
  const newUser = { ...user, id: crypto.randomUUID(), role: user.role || 'user', createdAt: new Date().toISOString() };
  db.users.push(newUser);
  saveDb(db);
  return newUser;
}

function createOrder(order) {
  const db = loadDb();
  const orderId = crypto.randomUUID();
  const newOrder = {
    id: orderId,
    userId: order.userId || null,
    email: order.email || null,
    sessionId: order.sessionId,
    amountTotal: order.amountTotal,
    status: order.status || 'pending',
    createdAt: new Date().toISOString()
  };
  db.orders.push(newOrder);
  order.items.forEach((item) => {
    db.orderItems.push({
      id: crypto.randomUUID(),
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    });
  });
  saveDb(db);
  return newOrder;
}

function getOrderBySessionId(sessionId) {
  return loadDb().orders.find((order) => order.sessionId === sessionId);
}

function getOrdersByUser(userId) {
  const db = loadDb();
  return db.orders
    .filter((order) => order.userId === userId)
    .map((order) => ({
      ...order,
      items: db.orderItems.filter((item) => item.orderId === order.id)
    }));
}

function getAllOrders() {
  const db = loadDb();
  return db.orders.map((order) => ({
    ...order,
    items: db.orderItems.filter((item) => item.orderId === order.id)
  }));
}

ensureSeedData();

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getUserByEmail,
  getUserById,
  createUser,
  createOrder,
  getOrderBySessionId,
  getOrdersByUser,
  getAllOrders
};
