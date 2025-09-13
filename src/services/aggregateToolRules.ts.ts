import type { SanitizeRules } from "@/types";

/**
 * Centralized rules for sanitizing aggregation pipelines.
 * 
 * Each key is a collection name, and the value is the $match filter
 * that should always be applied when that collection is queried
 * through $lookup or $unionWith.
 *
 * Example:
 *   - Users collection must always filter only active users.
 *   - Orders collection must only include delivered orders.
 *   - Invoices collection must only include certain regions.
 */


// **Example aggregate Rule obj**
/*
export const aggregateToolRules: SanitizeRules = {
  users: { isActive: true },
  orders: { status: "delivered" },
  invoices: { region: { $in: ["APAC", "EU"] } },
  products: { isArchived: { $ne: true } },
  sessions: { expiresAt: { $gt: new Date() } },
};

*/

export const aggregateToolRules: SanitizeRules = {
  // Define your rules here
};
