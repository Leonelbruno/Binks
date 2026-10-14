import { ConflictError, NotFoundError } from "../../shared/errors/AppError.js";
import type { BusinessRepository } from "../business/business.repository.js";
import type { Category, CategoryRepository } from "./category.repository.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schemas.js";

type Dependencies = {
  businesses: BusinessRepository;
  categories: CategoryRepository;
};

const DUPLICATE_NAME_CONSTRAINT = "category_business_id_name_key";
const UNIQUE_VIOLATION = "23505";

function isDuplicateNameError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, constraint } = error as { code?: string; constraint?: string };
  return code === UNIQUE_VIOLATION && constraint === DUPLICATE_NAME_CONSTRAINT;
}

export function createCategoryService({
  businesses,
  categories,
}: Dependencies) {
  async function assertBusinessExists(businessId: number): Promise<void> {
    const business = await businesses.findById(businessId);
    if (!business) {
      throw new NotFoundError("Negocio no encontrado");
    }
  }

  async function list(
    businessId: number,
    filters: { active?: boolean } = {},
  ): Promise<Category[]> {
    await assertBusinessExists(businessId);
    return categories.list(businessId, filters);
  }

  async function getById(
    businessId: number,
    categoryId: number,
  ): Promise<Category> {
    await assertBusinessExists(businessId);
    const category = await categories.findById(businessId, categoryId);
    if (!category) {
      throw new NotFoundError("Categoria no encontrada");
    }
    return category;
  }

  async function create(
    businessId: number,
    input: CreateCategoryInput,
  ): Promise<Category> {
    await assertBusinessExists(businessId);
    try {
      return await categories.create(businessId, input);
    } catch (error) {
      if (isDuplicateNameError(error)) {
        throw new ConflictError(
          `Ya existe una categoria con el nombre "${input.name}" en este negocio`,
        );
      }
      throw error;
    }
  }

  async function update(
    businessId: number,
    categoryId: number,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    await assertBusinessExists(businessId);
    try {
      const category = await categories.update(businessId, categoryId, input);
      if (!category) {
        throw new NotFoundError("Categoria no encontrada");
      }
      return category;
    } catch (error) {
      if (isDuplicateNameError(error)) {
        throw new ConflictError(
          "Ya existe una categoria con ese nombre en este negocio",
        );
      }
      throw error;
    }
  }

  return { list, getById, create, update };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
