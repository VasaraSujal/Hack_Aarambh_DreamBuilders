import ProductModel from "./product.model.js";

class ProductService {
  async createProduct(user, productData) {
    const newProduct = {
      productName: productData.productName,
      companyId: user.companyId,
      category: productData.category || "General",
      description: productData.description || "",
      status: "active"
    };

    const result = await ProductModel.create(newProduct);
    
    return {
      productId: result.insertedId,
      ...newProduct
    };
  }

  async getProductsByCompany(companyId) {
    return await ProductModel.findByCompanyId(companyId);
  }
}

export default new ProductService();
