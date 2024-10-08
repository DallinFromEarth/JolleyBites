import type { Ingredient } from '../../shared/types'
import { HttpError } from '../errors/HttpError'
import { D1Database } from '@cloudflare/workers-types';

export class IngredientsDataAccess {
  private DB: D1Database
  constructor(DB: D1Database) {
    this.DB = DB
  }

  public async getIngredientsForUser(userId: String) {
    try {
      const { results } = await this.DB.prepare(
        "SELECT * FROM ingredients WHERE user_id = ?"
      ).bind(userId).all();

      return results as Ingredient[];
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to fetch ingredients");
    }
  }

  public async getIngredientById(id: Number): Promise<Ingredient> {
    try {
      const { results } = await this.DB.prepare(
        "SELECT * FROM ingredients WHERE id = ?"
      ).bind(id).all();

      return results[0] as Ingredient;
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to fetch ingredient");
    }
  }

  public async insertIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<number> {
    try {
      const statement = await this.DB.prepare(`
      INSERT INTO ingredients (user_id, name, quantity, unit, purchase_price, price_per_unit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        ingredient.user_id,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.purchase_price,
        ingredient.price_per_unit,
        ingredient.notes
      );

      const result = await statement.run();

      if (result && typeof result.meta?.last_row_id === 'number') {
        return result.meta.last_row_id;
      } else {
        throw new Error('Failed to retrieve the inserted ID');
      }
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to insert ingredient");
    }
  }

  public async insertBatchIngredients(ingredients: Omit<Ingredient, 'id'>[]): Promise<number[]> {
    try {
      const insertedIds: number[] = [];
      const stmt = this.DB.prepare(`
      INSERT INTO ingredients (user_id, name, quantity, unit, purchase_price, price_per_unit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

      const batchPromises = ingredients.map(ingredient =>
        stmt.bind(
          ingredient.user_id,
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
          ingredient.purchase_price,
          ingredient.price_per_unit,
          ingredient.notes
        ).run()
      );

      const results = await Promise.all(batchPromises);

      for (const result of results) {
        if (result && typeof result.meta?.last_row_id === 'number') {
          insertedIds.push(result.meta.last_row_id);
        } else {
          console.warn('Failed to retrieve an inserted ID');
        }
      }

      return insertedIds;
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to insert ingredients");
    }
  }

  public async updateIngredient(ingredient: Ingredient): Promise<boolean> {
    try {
      const statement = await this.DB.prepare(`
      UPDATE ingredients
      SET user_id = ?, name = ?, quantity = ?, unit = ?, purchase_price = ?, price_per_unit = ?, notes = ?
      WHERE id = ?
    `).bind(
        ingredient.user_id,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.purchase_price,
        ingredient.price_per_unit,
        ingredient.notes,
        ingredient.id
      );

      const result = await statement.run();

      if (result && result.success) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to update ingredient");
    }
  }

  public async deleteIngredientsByIds(idsToDelete: number[]) {
    try {
      const placeholders = idsToDelete.map(() => '?').join(',');
      const query = `DELETE FROM ingredients WHERE id IN (${placeholders})`;

      const { results } = await this.DB.prepare(query)
        .bind(...idsToDelete)
        .run();

      return results;
    } catch (error) {
      console.error("Database error:", error);
      throw HttpError.internalServerError("Failed to delete ingredients");
    }
  }
}