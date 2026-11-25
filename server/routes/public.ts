import { Router } from 'express';
import type { Repo } from '../db/types';
import {
  catalogDeliveryCompanies,
  catalogProducts,
  catalogWilayas,
} from '../catalog';

export function publicRouter(repo: Repo): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: repo.kind });
  });

  /**
   * Server-authoritative catalog. The storefront may render local data for
   * speed, but the order total is always recomputed from this source.
   */
  router.get('/catalog', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      products: catalogProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sizes: p.sizes,
        colors: p.colors,
        images: p.images,
        brand: p.brand,
        material: p.material,
        inStock: p.stockQuantity > 0,
      })),
      wilayas: catalogWilayas,
      deliveryCompanies: catalogDeliveryCompanies,
    });
  });

  return router;
}
