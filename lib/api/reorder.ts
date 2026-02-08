"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function reorderTodos(orderedIds: string[]): Promise<void> {
  // Update each todo's sort_order based on its position in the array
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(todos)
        .set({ sort_order: index, updated_at: new Date() })
        .where(eq(todos.id, id))
    )
  )
}
