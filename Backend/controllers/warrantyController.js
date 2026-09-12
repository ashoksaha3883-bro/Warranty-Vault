require("dotenv").config();

const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");

const Warranty =
  require("../modal/Warrenty.js");

const {
  sendWarrantySavedConfirmationEmail,
} = require("../services/emailService.js");

const OCR_URL =
  "https://api.ocr.space/parse/image";

/*
==================================================
SCAN WARRANTY
==================================================
*/

const scanWarranty = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "No warranty document was uploaded.",
      });
    }

    const apiKey =
      process.env.OCR_SPACE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "OCR service is not configured. Add OCR_SPACE_API_KEY to your .env file.",
      });
    }

    /*
    ==================================================
    PREPARE FILE FOR OCR
    ==================================================
    */

    let ocrBuffer = req.file.buffer;
    let ocrMimeType = req.file.mimetype;
    let ocrFileName =
      req.file.originalname ||
      "warranty-document";

    /*
    Compress only images.
    PDFs stay unchanged.
    */

    if (
      req.file.mimetype &&
      req.file.mimetype.startsWith("image/")
    ) {
      const compressed =
        await compressImageForOCR(
          req.file.buffer
        );

      ocrBuffer =
        compressed.buffer;

      ocrMimeType =
        compressed.mimeType;

      ocrFileName =
        compressed.fileName;

      console.log(
        `Original image: ${(
          req.file.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      console.log(
        `Compressed image: ${(
          ocrBuffer.length /
          1024 /
          1024
        ).toFixed(2)} MB`
      );
    }

    /*
    ==================================================
    CREATE OCR FORM
    ==================================================
    */

    const form =
      new FormData();

    form.append(
      "file",
      ocrBuffer,
      {
        filename:
          ocrFileName,

        contentType:
          ocrMimeType ||
          "application/octet-stream",
      }
    );

    form.append(
      "language",
      "eng"
    );

    form.append(
      "OCREngine",
      "2"
    );

    form.append(
      "isOverlayRequired",
      "false"
    );

    form.append(
      "detectOrientation",
      "true"
    );

    form.append(
      "scale",
      "true"
    );

    form.append(
      "isTable",
      "true"
    );

    /*
    ==================================================
    SEND TO OCR
    ==================================================
    */

    const response =
      await axios.post(
        OCR_URL,
        form,
        {
          headers: {
            ...form.getHeaders(),
            apikey: apiKey,
          },

          maxContentLength:
            50 * 1024 * 1024,

          maxBodyLength:
            50 * 1024 * 1024,

          timeout: 120000,
        }
      );

    const result =
      response.data;

    if (
      result?.IsErroredOnProcessing ||
      !Array.isArray(
        result?.ParsedResults
      )
    ) {
      return res.status(422).json({
        success: false,
        message:
          result?.ErrorMessage ||
          result?.ErrorDetails ||
          "Unable to read the warranty document.",
      });
    }

    /*
    ==================================================
    COMBINE OCR TEXT
    ==================================================
    */

    const rawText =
      result.ParsedResults
        .map(
          (item) =>
            item?.ParsedText || ""
        )
        .filter(Boolean)
        .join("\n\n")
        .trim();

    if (!rawText) {
      return res.status(422).json({
        success: false,
        message:
          "No readable text was found in this document.",
      });
    }

    /*
    ==================================================
    EXTRACT WARRANTY DATA
    ==================================================
    */

    const extracted =
      extractWarrantyData(
        rawText
      );

    console.log(
      `OCR completed: ${
        extracted.productName ||
        "Unknown product"
      }`
    );

    return res.status(200).json({
      success: true,

      data: extracted,

      rawText,

      meta: {
        pages:
          result.ParsedResults
            .length,

        engine: 2,

        originalName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        originalSize:
          req.file.size,

        processedSize:
          ocrBuffer.length,
      },
    });
  } catch (error) {
    console.error(
      "Warranty OCR error:",
      error?.response?.data ||
        error?.message ||
        error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.response?.data
          ?.ErrorMessage ||
        error?.message ||
        "Warranty document scanning failed.",
    });
  }
};

/*
==================================================
IMAGE COMPRESSION
==================================================
*/

const compressImageForOCR = async (
  inputBuffer
) => {
  const maxBytes =
    900 * 1024;

  const qualities = [
    82,
    75,
    68,
    60,
    52,
    45,
  ];

  let lastBuffer =
    null;

  for (
    const quality of qualities
  ) {
    const output =
      await sharp(
        inputBuffer,
        {
          limitInputPixels:
            false,
        }
      )
        .rotate()
        .flatten({
          background:
            "#ffffff",
        })
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement:
            true,
        })
        .jpeg({
          quality,
          mozjpeg: true,
        })
        .toBuffer();

    lastBuffer =
      output;

    if (
      output.length <=
      maxBytes
    ) {
      return {
        buffer: output,
        mimeType:
          "image/jpeg",
        fileName:
          "warranty-document.jpg",
      };
    }
  }

  return {
    buffer:
      lastBuffer,
    mimeType:
      "image/jpeg",
    fileName:
      "warranty-document.jpg",
  };
};

/*
==================================================
CREATE WARRANTY
==================================================
*/

const createWarranty =
  async (
    req,
    res
  ) => {
    try {
      if (
        !req.user ||
        !req.user._id
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User is not authenticated",
        });
      }

      const {
        productName,
        brand,
        model,
        purchaseDate,
        warrantyStartDate,
        warrantyDuration,
        warrantyEndDate,
        invoiceNumber,
        serialNumber,
        serialNumbers,
        seller,
        contact,
        placeOfSupply,
        warrantyType,
        category,
        purchasePrice,
        documentUrl,
        productImageUrl,
        products,
      } = req.body;

      if (!productName) {
        return res.status(400).json({
          success: false,
          message:
            "Product name is required",
        });
      }

      if (!warrantyStartDate) {
        return res.status(400).json({
          success: false,
          message:
            "Warranty start date is required",
        });
      }

      if (!warrantyEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Warranty end date is required",
        });
      }

      const warranty =
        await Warranty.create({
          user:
            req.user._id,

          productName,

          brand,

          model,

          purchaseDate,

          warrantyStartDate,

          warrantyDuration,

          warrantyEndDate,

          invoiceNumber,

          serialNumber,

          serialNumbers,

          seller,

          contact,

          placeOfSupply,

          warrantyType,

          category,

          purchasePrice,

          documentUrl,

          productImageUrl,

          products,

          status:
            "active",

          remindersSent: [],
        });

      console.log(
        "Warranty saved:",
        warranty._id.toString()
      );

      if (
        req.user
          .emailNotificationsEnabled ===
        true
      ) {
        sendWarrantySavedConfirmationEmail({
          user: req.user,
          warranty,
        })
          .then(
            (
              emailResult
            ) => {
              if (
                !emailResult?.success
              ) {
                console.error(
                  "Warranty saved confirmation email failed:",
                  emailResult?.error ||
                    "Unknown email error"
                );
              }
            }
          )
          .catch(
            (
              emailError
            ) => {
              console.error(
                "Warranty saved confirmation email error:",
                emailError?.message ||
                  emailError
              );
            }
          );
      }

      return res.status(201).json({
        success: true,

        message:
          "Warranty saved successfully",

        warranty,
      });
    } catch (error) {
      console.error(
        "Create Warranty Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to save warranty",
      });
    }
  };

/*
==================================================
GET MY WARRANTIES
==================================================
*/

const getMyWarranties =
  async (
    req,
    res
  ) => {
    try {
      if (
        !req.user ||
        !req.user._id
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User is not authenticated",
        });
      }

      const warranties =
        await Warranty.find({
          user:
            req.user._id,
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        warranties,
      });
    } catch (error) {
      console.error(
        "Get Warranties Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get warranties",
      });
    }
  };

/*
==================================================
YOUR EXISTING FUNCTIONS
==================================================

KEEP ALL OF YOUR EXISTING FUNCTIONS BELOW THIS POINT:

extractWarrantyData
cleanOCRText
normalizeDate
makeISODate
getMonthNumber
extractAllDates
extractPurchaseDate
extractWarrantyStartDate
extractWarrantyEndDate
extractWarrantyDuration
calculateWarrantyEndDate
parseISODate
extractInvoiceNumber
isUsefulInvoiceNumber
extractSeller
extractSellerContact
extractPlaceOfSupply
extractWarrantyType
extractProducts
extractProductsFallback
detectProductBrand
isSerialLike
detectCategory
removeDuplicateProducts
cleanValue
cleanProductLine
isUsefulProductName
escapeRegex
*/

/*
==================================================
EXPORT
==================================================
*/

module.exports = {
  scanWarranty,
  createWarranty,
  getMyWarranties,
};