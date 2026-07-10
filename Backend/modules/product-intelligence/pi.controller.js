import {
  getProductOverview,
  getProductIntelligence,
} from "./pi.service.js";

/**
 * GET /api/product-intelligence/overview
 * Returns a high-level summary for every product in the company.
 */
export const overviewHandler = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const overview = await getProductOverview(companyId);

    res.status(200).json({
      success: true,
      totalProducts: overview.length,
      products: overview,
    });
  } catch (error) {
    console.error("Product overview error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/product-intelligence/:productId
 * Returns deep aggregated intelligence for a single product.
 */
export const intelligenceHandler = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { productId } = req.params;

    const intelligence = await getProductIntelligence(companyId, productId);

    res.status(200).json({
      success: true,
      ...intelligence,
    });
  } catch (error) {
    console.error("Product intelligence error:", error);
    const status = error.message === "Product not found" ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error.message,
    });
  }
};
