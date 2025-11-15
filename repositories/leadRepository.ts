import { randomUUID } from "crypto";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function saveLead(data: {
  name: string;
  email: string;
  company: string;
  headcount: string;
  message: string;
}) {
  await db.insert(leads).values({
    id: randomUUID(),
    ...data,
    createdAt: now(),
  });
}

export async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}
