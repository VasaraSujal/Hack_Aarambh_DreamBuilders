import { v4 as uuidv4 } from "uuid";
import CallModel from "./audio.model.js";

export const uploadAudio = async (req, res) => {
  try {
    console.log("📤 Upload request received");
    console.log("File object:", req.file);
    console.log("Body:", req.body);

    const file = req.file;

    if (!file) {
      console.log("❌ No file found in request");
      return res.status(400).json({
        message: "Audio file required",
        received: {
          file: req.file,
          body: req.body,
        },
      });
    }

    console.log("✅ File received:", file.filename);
    const callId = uuidv4();
    console.log("Generated callId:", callId);

    const callData = {
      callId,
      employeeId: req.user?.userId?.toString() || null,
      companyId: req.user?.companyId || null,
      productId: (req.body.productId && req.body.productId.trim() !== "") ? req.body.productId : null,
      fileName: file.filename,
      filePath: file.path,
      transcript: null,
      aiInsights: null,
      status: "uploaded",
      product_name: null,
      call_duration: null,
      customer_name: req.body.customer_name || '',
      customer_email: req.body.customer_email || '',
      customer_phone: req.body.customer_phone || '',
      employeeName: req.user?.name || "Unknown"
    };

    await CallModel.create(callData);
    console.log("✅ Data saved to MongoDB");

    res.status(200).json({
      message: "Audio uploaded successfully",
      callId,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
};

export const uploadText = async (req, res) => {
  try {
    console.log("📝 Text upload request received");
    const { text, fileName, customer_name, customer_email, customer_phone, productId } = req.body;

    if (!text) {
      console.log("❌ No text found in request");
      return res.status(400).json({
        message: "Text content required",
      });
    }

    const callId = uuidv4();
    console.log("Generated callId for text:", callId);

    const callData = {
      callId,
      employeeId: req.user?.userId?.toString() || null,
      companyId: req.user?.companyId || null,
      productId: (productId && productId.trim() !== "") ? productId : null,
      fileName: fileName || `Text_Input_${new Date().toISOString().substring(0, 10)}.txt`,
      filePath: null, // No physical file path
      transcript: text, // Start already transcribed
      aiInsights: null,
      status: "transcribed", // Skip uploading/transcribing phase, go straight to "transcribed"
      product_name: null,
      call_duration: null,
      customer_name: customer_name || '',
      customer_email: customer_email || '',
      customer_phone: customer_phone || '',
      employeeName: req.user?.name || "Unknown"
    };

    await CallModel.create(callData);
    console.log("✅ Text data saved to MongoDB");

    res.status(200).json({
      message: "Text uploaded successfully",
      callId,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
};

export const getAudioByCallId = async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await CallModel.findById(callId);

    if (!call) {
      return res.status(404).json({
        message: "Call not found",
      });
    }

    res.status(200).json({
      message: "Call retrieved successfully",
      data: call,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export const getAllAudio = async (req, res) => {
  try {
    const calls = await CallModel.findAll();

    res.status(200).json({
      message: "All calls retrieved successfully",
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};