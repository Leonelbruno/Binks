import { NotFoundError } from "../../shared/errors/AppError.js";
import type { Business, BusinessRepository } from "./business.repository.js";

type Dependencies = {
  businesses: BusinessRepository;
};

export function createBusinessService({ businesses }: Dependencies) {
  async function getById(businessId: number): Promise<Business> {
    const business = await businesses.findById(businessId);
    if (!business) {
      throw new NotFoundError("Negocio no encontrado");
    }
    return business;
  }

  return { getById };
}

export type BusinessService = ReturnType<typeof createBusinessService>;
