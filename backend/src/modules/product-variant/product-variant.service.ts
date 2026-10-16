import { ConflictError, NotFoundError } from "../../shared/errors/AppError.js";
import type { BusinessRepository } from "../business/business.repository.js";
import type { ProductRepository } from "../product/product.repository.js";
import type {
    ProductVariant,
    ProductVariantRepository,
} from "./product-variant.repository.js";
import type {
    CreateProductVariantInput,
    UpdateProductVariantInput,
} from "./product-variant.schemas.js";

type Dependencies = {
    businesses: BusinessRepository;
    products: ProductRepository;
    variants: ProductVariantRepository;
};

const DUPLICATE_NAME_CONSTRAINT =
    "product_variant_product_id_name_key";

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

export function createProductVariantService({
    businesses,
    products,
    variants,
}: Dependencies) {
    async function assertBusinessExists(
        businessId: number,
    ): Promise<void> {
        const business = await businesses.findById(businessId);

        if (!business) {
            throw new NotFoundError("Negocio no encontrado");
        }
    }

    async function assertProductExists(
        businessId: number,
        productId: number,
    ): Promise<void> {
        const product = await products.findById(
            businessId,
            productId,
        );

        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
    }

    async function list(
        businessId: number,
        productId: number,
        filters: { active?: boolean } = {},
    ): Promise<ProductVariant[]> {
        await assertBusinessExists(businessId);
        await assertProductExists(businessId, productId);

        return variants.list(
            businessId,
            productId,
            filters,
        );
    }

    async function getById(
        businessId: number,
        productId: number,
        variantId: number,
    ): Promise<ProductVariant> {
        await assertBusinessExists(businessId);
        await assertProductExists(businessId, productId);

        const variant = await variants.findById(
            businessId,
            productId,
            variantId,
        );

        if (!variant) {
            throw new NotFoundError("Variante no encontrada");
        }

        return variant;
    }

    async function create(
        businessId: number,
        productId: number,
        input: CreateProductVariantInput,
    ): Promise<ProductVariant> {
        await assertBusinessExists(businessId);
        await assertProductExists(businessId, productId);

        try {
            return await variants.create(
                businessId,
                productId,
                input,
            );
        } catch (error) {
            if (isDuplicateNameError(error)) {
                throw new ConflictError(
                    `Ya existe una variante con el nombre "${input.name}" en este producto`,
                );
            }

            throw error;
        }
    }

    async function update(
        businessId: number,
        productId: number,
        variantId: number,
        input: UpdateProductVariantInput,
    ): Promise<ProductVariant> {
        await assertBusinessExists(businessId);
        await assertProductExists(businessId, productId);

        try {
            const variant = await variants.update(
                businessId,
                productId,
                variantId,
                input,
            );

            if (!variant) {
                throw new NotFoundError(
                    "Variante no encontrada",
                );
            }

            return variant;
        } catch (error) {
            if (isDuplicateNameError(error)) {
                throw new ConflictError(
                    "Ya existe una variante con ese nombre en este producto",
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

export type ProductVariantService = ReturnType<
    typeof createProductVariantService
>;