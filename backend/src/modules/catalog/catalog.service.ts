import { NotFoundError } from "../../shared/errors/AppError.js";
import type { BusinessRepository } from "../business/business.repository.js";
import type {
    Catalog,
    CatalogRepository,
} from "./catalog.repository.js";

type Dependencies = {
    businesses: BusinessRepository;
    catalog: CatalogRepository;
};

export function createCatalogService({
    businesses,
    catalog,
}: Dependencies) {
    async function getByBusiness(
        businessId: number,
    ): Promise<Catalog> {
        const business = await businesses.findById(businessId);

        if (!business) {
            throw new NotFoundError("Negocio no encontrado");
        }

        return catalog.getByBusiness(businessId);
    }

    return {
        getByBusiness,
    };
}

export type CatalogService = ReturnType<
    typeof createCatalogService
>;