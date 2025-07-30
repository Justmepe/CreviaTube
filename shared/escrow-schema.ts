import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, campaigns } from "./schema";

// Budget escrow transactions table
export const budgetEscrow = pgTable("budget_escrow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // Full budget amount
  escrowAmount: decimal("escrow_amount", { precision: 10, scale: 2 }).notNull(), // 80% for clippers
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(), // 20% for platform
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull(), // Remaining escrow balance
  lockedBalance: decimal("locked_balance", { precision: 10, scale: 2 }).default("0").notNull(), // Pending payments
  status: text("status").notNull().default("active"), // active, depleted, refunded
  paymentMethod: text("payment_method").notNull(), // stripe, bank_transfer, crypto
  transactionId: text("transaction_id"), // External payment reference
  isLocked: boolean("is_locked").notNull().default(true), // Cannot withdraw once locked
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auto-payment transactions for clippers
export const autoPayments = pgTable("auto_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowId: varchar("escrow_id").notNull().references(() => budgetEscrow.id),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  eventId: varchar("event_id").notNull(), // Reference to tracking event that triggered payment
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  paymentMethod: text("payment_method").notNull(), // bank, paypal, mobile_money, crypto
  paymentDetails: text("payment_details"), // JSON with payment-specific details
  scheduledAt: timestamp("scheduled_at").notNull(), // When payment should be processed
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  retryCount: decimal("retry_count", { precision: 2, scale: 0 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Escrow refunds (only allowed in special circumstances)
export const escrowRefunds = pgTable("escrow_refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowId: varchar("escrow_id").notNull().references(() => budgetEscrow.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(), // Reason for refund request
  status: text("status").notNull().default("pending"), // pending, approved, rejected, processed
  adminId: varchar("admin_id").references(() => users.id), // Admin who approved/rejected
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const budgetEscrowRelations = relations(budgetEscrow, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [budgetEscrow.campaignId],
    references: [campaigns.id],
  }),
  creator: one(users, {
    fields: [budgetEscrow.creatorId],
    references: [users.id],
  }),
  autoPayments: many(autoPayments),
  refunds: many(escrowRefunds),
}));

export const autoPaymentsRelations = relations(autoPayments, ({ one }) => ({
  escrow: one(budgetEscrow, {
    fields: [autoPayments.escrowId],
    references: [budgetEscrow.id],
  }),
  clipper: one(users, {
    fields: [autoPayments.clipperId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [autoPayments.campaignId],
    references: [campaigns.id],
  }),
}));

export const escrowRefundsRelations = relations(escrowRefunds, ({ one }) => ({
  escrow: one(budgetEscrow, {
    fields: [escrowRefunds.escrowId],
    references: [budgetEscrow.id],
  }),
  creator: one(users, {
    fields: [escrowRefunds.creatorId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [escrowRefunds.campaignId],
    references: [campaigns.id],
  }),
  admin: one(users, {
    fields: [escrowRefunds.adminId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertBudgetEscrowSchema = createInsertSchema(budgetEscrow);
export const insertAutoPaymentSchema = createInsertSchema(autoPayments);
export const insertEscrowRefundSchema = createInsertSchema(escrowRefunds);

export type BudgetEscrow = typeof budgetEscrow.$inferSelect;
export type InsertBudgetEscrow = z.infer<typeof insertBudgetEscrowSchema>;
export type AutoPayment = typeof autoPayments.$inferSelect;
export type InsertAutoPayment = z.infer<typeof insertAutoPaymentSchema>;
export type EscrowRefund = typeof escrowRefunds.$inferSelect;
export type InsertEscrowRefund = z.infer<typeof insertEscrowRefundSchema>;