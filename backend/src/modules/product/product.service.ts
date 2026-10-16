import { ConflictError, NotFoundError } from "../../shared/errors/AppError.js";
import type { BusinessRepository } from "../business/business.repository.js";
import type { CategoryRepository } from "../category/category.repository.js";
import type { Product, ProductRepository } from "./product.repository.js";
import type {
    CreateProductInput,
    UpdateProductInput,
} from "./product.schemas.js";

type Dependencies = {
    businesses: BusinessRepository;
    categories: CategoryRepository;
    products: ProductRepository;
};

const DUPLICATE_NAME_CONSTRAINT =
    "product_business_id_category_id_name_key";

const UNIQUE_VIOLATION = "23505";

function isDuplicateNameError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;

    const { code, constraint } = error as {
        code?: string;
        constraint?: string;
    };

    return (
        code === UNIQUE_VIOLATION &&
        constraint === DUPLICATE_NAME_CONSTRAINT
    );
}

export function createProductService({
    businesses,
    categories,
    products,
}: Dependencies) {
    async function assertBusinessExists(businessId: number): Promise<void> {
        const business = await businesses.findById(businessId);

        if (!business) {
            throw new NotFoundError("Negocio no encontrado");
        }
    }

    async function assertCategoryExists(
        businessId: number,
        categoryId: number,
    ): Promise<void> {
        const category = await categories.findById(businessId, categoryId);

        if (!category) {
            throw new NotFoundError("Categoria no encontrada");
        }
    }

    async function list(
        businessId: number,
        filters: { active?: boolean } = {},
    ): Promise<Product[]> {
        await assertBusinessExists(businessId);

        return products.list(businessId, filters);
    }

    async function getById(
        businessId: number,
        productId: number,
    ): Promise<Product> {
        await assertBusinessExists(businessId);

        const product = await products.findById(businessId, productId);

        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }

        return product;
    }

    async function create(
        businessId: number,
        input: CreateProductInput,
    ): Promise<Product> {
        await assertBusinessExists(businessId);

        await assertCategoryExists(
            businessId,
            input.categoryId,
        );

        try {
            return await products.create(businessId, input);
        } catch (error) {
            if (isDuplicateNameError(error)) {
                throw new ConflictError(
                    `Ya existe un producto con el nombre "${input.name}" en esta categoria`,
                );
            }

            throw error;
        }
    }

    async function update(
        businessId: number,
        productId: number,
        input: UpdateProductInput,
    ): Promise<Product> {
        await assertBusinessExists(businessId);

        if (input.categoryId !== undefined) {
            await assertCategoryExists(
                businessId,
                input.categoryId,
            );
        }

        try {
            const product = await products.update(
                businessId,
                productId,
                input,
            );

            if (!product) {
                throw new NotFoundError("Producto no encontrado");
            }

            return product;
        } catch (error) {
            if (isDuplicateNameError(error)) {
                throw new ConflictError(
                    "Ya existe un producto con ese nombre en esta categoria",
                );
            }

            throw error;
        }
    }

    return {
        list,
        getById,
        create,
        update,
    };
}

export type ProductService = ReturnType<typeof createProductService>;