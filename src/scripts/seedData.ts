import { connect, connection } from "mongoose";
import { nanoid } from "nanoid";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { OrderModel } from "../models/Order";
import { env } from "../config/env";

const MONGODB_URI = env.MONGODB_URI || "mongodb://localhost:27017/mongodb-nl-demo";
// Sample data generators
const sampleUsers = [
  {
    name: "Alice Johnson",
    email: "alice.johnson@email.com",
    age: 28,
    city: "New York",
    country: "USA",
    preferences: {
      categories: ["Electronics", "Books", "Fashion"],
      priceRange: { min: 50, max: 1000 },
    },
    membershipLevel: "gold" as const,
    totalOrders: 15,
    totalSpent: 2850,
  },
  {
    name: "Bob Smith",
    email: "bob.smith@email.com",
    age: 35,
    city: "San Francisco",
    country: "USA",
    preferences: {
      categories: ["Electronics", "Sports", "Home"],
      priceRange: { min: 100, max: 2000 },
    },
    membershipLevel: "platinum" as const,
    totalOrders: 32,
    totalSpent: 8420,
  },
  {
    name: "Carol Davis",
    email: "carol.davis@email.com",
    age: 42,
    city: "London",
    country: "UK",
    preferences: {
      categories: ["Books", "Fashion", "Health"],
      priceRange: { min: 20, max: 500 },
    },
    membershipLevel: "silver" as const,
    totalOrders: 8,
    totalSpent: 980,
  },
  {
    name: "David Wilson",
    email: "david.wilson@email.com",
    age: 23,
    city: "Austin",
    country: "USA",
    preferences: {
      categories: ["Electronics", "Gaming", "Sports"],
      priceRange: { min: 30, max: 800 },
    },
    membershipLevel: "bronze" as const,
    totalOrders: 3,
    totalSpent: 245,
  },
  {
    name: "Emma Thompson",
    email: "emma.thompson@email.com",
    age: 31,
    city: "Toronto",
    country: "Canada",
    preferences: {
      categories: ["Books", "Home", "Fashion"],
      priceRange: { min: 25, max: 600 },
    },
    membershipLevel: "gold" as const,
    totalOrders: 12,
    totalSpent: 1850,
  },
];

const sampleProducts = [
  {
    name: "MacBook Pro 16-inch",
    description: "Powerful laptop with M3 chip, perfect for professionals and creators.",
    category: "Electronics",
    subcategory: "Laptops",
    price: 2499,
    originalPrice: 2699,
    discount: 7.4,
    brand: "Apple",
    stockQuantity: 25,
    ratings: { average: 4.8, count: 342 },
    features: ["M3 Chip", "16GB RAM", "512GB SSD", "Liquid Retina Display"],
    tags: ["laptop", "apple", "professional", "creative"],
    specifications: {
      processor: "Apple M3",
      memory: "16GB",
      storage: "512GB SSD",
      display: "16-inch Liquid Retina",
    },
    salesCount: 128,
  },
  {
    name: "iPhone 15 Pro",
    description: "Latest iPhone with titanium design and advanced camera system.",
    category: "Electronics",
    subcategory: "Smartphones",
    price: 999,
    originalPrice: 1099,
    discount: 9.1,
    brand: "Apple",
    stockQuantity: 50,
    ratings: { average: 4.7, count: 567 },
    features: ["A17 Pro Chip", "48MP Camera", "Titanium Build", "USB-C"],
    tags: ["smartphone", "apple", "camera", "premium"],
    specifications: {
      processor: "A17 Pro",
      camera: "48MP Main",
      storage: "128GB",
      connectivity: "5G",
    },
    salesCount: 234,
  },
  {
    name: "The Great Gatsby",
    description: "Classic American novel by F. Scott Fitzgerald.",
    category: "Books",
    subcategory: "Fiction",
    price: 12.99,
    originalPrice: 15.99,
    discount: 18.8,
    brand: "Scribner",
    stockQuantity: 100,
    ratings: { average: 4.2, count: 1234 },
    features: ["Classic Literature", "Paperback", "180 pages"],
    tags: ["classic", "american", "literature", "fiction"],
    specifications: {
      author: "F. Scott Fitzgerald",
      pages: "180",
      format: "Paperback",
      language: "English",
    },
    salesCount: 89,
  },
  {
    name: "Nike Air Max 270",
    description: "Comfortable running shoes with Max Air cushioning.",
    category: "Sports",
    subcategory: "Footwear",
    price: 150,
    originalPrice: 180,
    discount: 16.7,
    brand: "Nike",
    stockQuantity: 75,
    ratings: { average: 4.5, count: 892 },
    features: ["Max Air Cushioning", "Breathable Mesh", "Durable Rubber Sole"],
    tags: ["running", "nike", "comfortable", "athletic"],
    specifications: {
      material: "Mesh and Synthetic",
      sole: "Rubber",
      closure: "Lace-up",
      gender: "Unisex",
    },
    salesCount: 156,
  },
  {
    name: "Instant Pot Duo 7-in-1",
    description: "Multi-functional electric pressure cooker for quick and easy meals.",
    category: "Home",
    subcategory: "Kitchen",
    price: 79.99,
    originalPrice: 99.99,
    discount: 20,
    brand: "Instant Pot",
    stockQuantity: 40,
    ratings: { average: 4.6, count: 2341 },
    features: ["7-in-1 Functions", "6 Quart Capacity", "Smart Programming"],
    tags: ["kitchen", "cooking", "pressure cooker", "appliance"],
    specifications: {
      capacity: "6 Quarts",
      functions: "7-in-1",
      material: "Stainless Steel",
      warranty: "1 Year",
    },
    salesCount: 312,
  },
];

async function seedDatabase(): Promise<void> {
  try {
    // Connect to MongoDB
    await connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
    console.log("Cleared existing data");

    // Insert users
    const users = await UserModel.insertMany(sampleUsers);
    console.log(`✅ Inserted ${users.length} users`);

    // Insert products
    const products = await ProductModel.insertMany(sampleProducts);
    console.log(`✅ Inserted ${products.length} products`);

    // Generate orders
    const orders = [];
    const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered"];
    const paymentMethods = ["credit_card", "debit_card", "paypal", "bank_transfer"];
    const paymentStatuses = ["pending", "completed"];

    for (let i = 0; i < 20; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const orderProducts = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order

      let totalAmount = 0;
      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.price;
        const discount = Math.floor(Math.random() * 20); // 0-20% discount

        orderProducts.push({
          product: product._id,
          quantity,
          price,
          discount,
        });

        totalAmount += price * quantity * (1 - discount / 100);
      }

      const discountAmount = Math.floor(Math.random() * 50);
      const finalAmount = Math.max(totalAmount - discountAmount, 0);

      const order = {
        user: user._id,
        orderNumber: `ORD-${nanoid(8)}`,
        items: orderProducts,
        totalAmount,
        discountAmount,
        finalAmount,
        status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)] as any,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)] as any,
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)] as any,
        shippingAddress: {
          street: `${Math.floor(Math.random() * 9999)} Main St`,
          city: user.city,
          state: "State",
          country: user.country,
          zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        },
        estimatedDelivery: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within 7 days
        customerNotes: Math.random() > 0.7 ? "Please handle with care" : undefined,
      };

      orders.push(order);
    }

    const insertedOrders = await OrderModel.insertMany(orders);
    console.log(`✅ Inserted ${insertedOrders.length} orders`);

    console.log("\\n🎉 Database seeded successfully!");
    console.log("\\n📊 Summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Orders: ${insertedOrders.length}`);

    console.log("\\n💡 Try some natural language queries:");
    console.log("- 'Show me all users from USA'");
    console.log("- 'Find Apple products under $1000'");
    console.log("- 'Get all delivered orders this month'");
    console.log("- 'Show me gold members who spent more than $1000'");
    console.log("- 'Find electronics with ratings above 4.5'");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await connection.close();
    console.log("\\n🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
