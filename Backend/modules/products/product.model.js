import { getDatabase } from "../../config/db.js";

class ProductModel {
  constructor() {
    this.collectionName = "products";
  }

  getCollection() {
    const db = getDatabase();
    return db.collection(this.collectionName);
  }

  async findById(productId) {
    const collection = this.getCollection();
    const { ObjectId } = await import("mongodb");
    return await collection.findOne({ _id: new ObjectId(productId) });
  }

  async create(productData) {
    const collection = this.getCollection();
    const result = await collection.insertOne({
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result;
  }

  async findByCompanyId(companyId) {
    const collection = this.getCollection();
    return await collection.find({ companyId: companyId, status: "active" }).toArray();
  }
}

export default new ProductModel();
