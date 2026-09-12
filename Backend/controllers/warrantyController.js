
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
    // -----------------------------------------------
    // CHECK FILE
    // -----------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "No warranty document was uploaded.",
      });
    }

    // -----------------------------------------------
    // CHECK OCR API KEY
    // -----------------------------------------------

    const apiKey =
      process.env.OCR_SPACE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "OCR service is not configured. Add OCR_SPACE_API_KEY to your .env file.",
      });
    }

    // -----------------------------------------------
    // COMPRESS IMAGE
    // -----------------------------------------------

    let processedFile;

    try {
      processedFile =
        await compressImageForOCR(
          req.file
        );
    } catch (compressionError) {
      console.error(
        "Image compression error:",
        compressionError?.message ||
          compressionError
      );

      return res.status(422).json({
        success: false,
        message:
          "Unable to process the uploaded image.",
      });
    }

    // -----------------------------------------------
    // LOG FILE SIZE
    // -----------------------------------------------

    console.log(
      `Original file: ${(
        req.file.size /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    console.log(
      `OCR file: ${(
        processedFile.buffer.length /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    // -----------------------------------------------
    // CREATE OCR FORM
    // -----------------------------------------------

    const form =
      new FormData();

    form.append(
      "file",
      processedFile.buffer,
      {
        filename:
          processedFile.filename,

        contentType:
          processedFile.mimetype,
      }
    );

    // -----------------------------------------------
    // OCR SETTINGS
    // -----------------------------------------------

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

    // -----------------------------------------------
    // SEND TO OCR SPACE
    // -----------------------------------------------

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

    // -----------------------------------------------
    // OCR ERROR
    // -----------------------------------------------

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

    // -----------------------------------------------
    // COMBINE OCR PAGES
    // -----------------------------------------------

    const rawText =
      result.ParsedResults
        .map(
          (item) =>
            item?.ParsedText || ""
        )
        .filter(Boolean)
        .join("\n\n")
        .trim();

    // -----------------------------------------------
    // CHECK OCR TEXT
    // -----------------------------------------------

    if (!rawText) {
      return res.status(422).json({
        success: false,
        message:
          "No readable text was found in this document.",
      });
    }

    // -----------------------------------------------
    // EXTRACT DATA
    // -----------------------------------------------

    const extracted =
      extractWarrantyData(
        rawText
      );

    // -----------------------------------------------
    // LOG
    // -----------------------------------------------

    console.log(
      `OCR completed: ${
        extracted.productName ||
        "Unknown product"
      }`
    );

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

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
          processedFile.buffer.length,
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
MAIN DATA EXTRACTION
==================================================
*/

function extractWarrantyData(
  text
) {
  const cleanedText =
    cleanOCRText(text);

  const purchaseDate =
    extractPurchaseDate(
      cleanedText
    );

  const invoiceNumber =
    extractInvoiceNumber(
      cleanedText
    );

  const seller =
    extractSeller(
      cleanedText
    );

  const contact =
    extractSellerContact(
      cleanedText
    );

  const placeOfSupply =
    extractPlaceOfSupply(
      cleanedText
    );

  let warrantyStartDate =
    extractWarrantyStartDate(
      cleanedText
    );

  const warrantyDuration =
    extractWarrantyDuration(
      cleanedText
    );

  let warrantyEndDate =
    extractWarrantyEndDate(
      cleanedText
    );

  // If warranty start is not explicit,
  // use purchase date.

  if (
    !warrantyStartDate &&
    purchaseDate
  ) {
    warrantyStartDate =
      purchaseDate;
  }

  // Calculate end date when possible.

  if (
    !warrantyEndDate &&
    warrantyStartDate &&
    warrantyDuration
  ) {
    warrantyEndDate =
      calculateWarrantyEndDate(
        warrantyStartDate,
        warrantyDuration
      );
  }

  // PRODUCTS

  const products =
    extractProducts(
      cleanedText
    );

  const primaryProduct =
    products[0] || {};

  const productName =
    primaryProduct.productName ||
    "";

  const brand =
    primaryProduct.brand ||
    "";

  const model =
    primaryProduct.modelNumber ||
    "";

  const serialNumber =
    primaryProduct.serialNumber ||
    "";

  // CATEGORY

  const category =
    detectCategory(
      productName,
      brand,
      model,
      cleanedText
    );

  // WARRANTY TYPE

  const warrantyType =
    extractWarrantyType(
      cleanedText
    );

  return {
    productName,

    brand,

    model,

    modelNumber: model,

    serialNumber,

    serialNumbers:
      primaryProduct.serialNumbers ||
      [],

    purchaseDate,

    warrantyStartDate,

    warrantyDuration,

    warrantyEndDate,

    seller,

    invoiceNumber,

    warrantyType,

    category,

    placeOfSupply,

    contact,

    products,
  };
}

/*
==================================================
CLEAN OCR
==================================================
*/

function cleanOCRText(
  text
) {
  return String(text || "")
    .replace(
      /\r/g,
      "\n"
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n[ ]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

/*
==================================================
DATE NORMALIZATION
==================================================
*/

function normalizeDate(
  value
) {
  if (!value) {
    return "";
  }

  let text =
    String(value)
      .trim()
      .replace(
        /,/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      );

  text =
    text
      .replace(
        /^date\s*(is|:|-)?\s*/i,
        ""
      )
      .replace(
        /^dated\s*(is|:|-)?\s*/i,
        ""
      )
      .trim();

  let match =
    text.match(
      /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
    );

  if (match) {
    return makeISODate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  match =
    text.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
    );

  if (match) {
    let year =
      Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    return makeISODate(
      year,
      Number(match[2]),
      Number(match[1])
    );
  }

  match =
    text.match(
      /^(\d{1,2})\s+([A-Za-z]+)[\s-]+(\d{2,4})$/i
    );

  if (match) {
    const month =
      getMonthNumber(
        match[2]
      );

    if (!month) {
      return "";
    }

    let year =
      Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    return makeISODate(
      year,
      month,
      Number(match[1])
    );
  }

  match =
    text.match(
      /^([A-Za-z]+)\s+(\d{1,2})[\s-]+(\d{2,4})$/i
    );

  if (match) {
    const month =
      getMonthNumber(
        match[1]
      );

    if (!month) {
      return "";
    }

    let year =
      Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    return makeISODate(
      year,
      month,
      Number(match[2])
    );
  }

  return "";
}

/*
==================================================
MAKE ISO DATE
==================================================
*/

function makeISODate(
  year,
  month,
  day
) {
  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return "";
  }

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return "";
  }

  return [
    year,
    String(month).padStart(
      2,
      "0"
    ),
    String(day).padStart(
      2,
      "0"
    ),
  ].join("-");
}

/*
==================================================
MONTH
==================================================
*/

function getMonthNumber(
  month
) {
  const months = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  return (
    months[
      String(month)
        .toLowerCase()
        .replace(
          /\./g,
          ""
        )
    ] || 0
  );
}

/*
==================================================
FIND ALL DATES
==================================================
*/

function extractAllDates(
  text
) {
  const dates = [];

  const numericMatches =
    text.match(
      /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/gi
    ) || [];

  const dayMonthMatches =
    text.match(
      /\b\d{1,2}\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[\s-]+\d{2,4}\b/gi
    ) || [];

  const monthDayMatches =
    text.match(
      /\b(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{1,2}[\s-]+\d{2,4}\b/gi
    ) || [];

  const allMatches = [
    ...numericMatches,
    ...dayMonthMatches,
    ...monthDayMatches,
  ];

  for (
    const value of allMatches
  ) {
    const iso =
      normalizeDate(
        value
      );

    if (
      iso &&
      !dates.includes(iso)
    ) {
      dates.push(iso);
    }
  }

  return dates;
}

/*
==================================================
PURCHASE DATE
==================================================
*/

function extractPurchaseDate(
  text
) {
  const invoiceIndex =
    text.search(
      /invoice\s*(?:no|number|#|id)?/i
    );

  if (
    invoiceIndex >= 0
  ) {
    const nearbyText =
      text.substring(
        invoiceIndex,
        invoiceIndex + 600
      );

    const dates =
      extractAllDates(
        nearbyText
      );

    if (dates.length) {
      return dates[0];
    }
  }

  const patterns = [
    /(?:date\s+of\s+purchase|purchase\s+date)\s*(?:is|:|-)?\s*([^\n]+)/i,

    /(?:invoice|bill)\s+date\s*(?:is|:|-)?\s*([^\n]+)/i,

    /(?:invoice|bill)\s+dated\s*(?:is|:|-)?\s*([^\n]+)/i,

    /(?:dated)\s*([^\n]+)/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (!match) {
      continue;
    }

    const dates =
      extractAllDates(
        match[1]
      );

    if (dates.length) {
      return dates[0];
    }
  }

  const dates =
    extractAllDates(
      text
    );

  return dates[0] || "";
}

/*
==================================================
WARRANTY START
==================================================
*/

function extractWarrantyStartDate(
  text
) {
  const patterns = [
    /(?:warranty|guarantee)\s*(?:start|starts|begin|begins|from)\s*(?:date)?\s*(?:is|:|-)?\s*([^\n]+)/i,

    /warranty\s+valid\s+from\s*(?:is|:|-)?\s*([^\n]+)/i,

    /valid\s+from\s*(?:is|:|-)?\s*([^\n]+)/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (!match) {
      continue;
    }

    const dates =
      extractAllDates(
        match[1]
      );

    if (dates.length) {
      return dates[0];
    }
  }

  return "";
}

/*
==================================================
WARRANTY END
==================================================
*/

function extractWarrantyEndDate(
  text
) {
  const patterns = [
    /(?:warranty|guarantee)\s*(?:end|ends|expiry|expires|expiration)\s*(?:date)?\s*(?:is|:|-)?\s*([^\n]+)/i,

    /(?:valid\s+till|valid\s+until|valid\s+up\s+to)\s*(?:is|:|-)?\s*([^\n]+)/i,

    /(?:expiry\s+date)\s*(?:is|:|-)?\s*([^\n]+)/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (!match) {
      continue;
    }

    const dates =
      extractAllDates(
        match[1]
      );

    if (dates.length) {
      return dates[0];
    }
  }

  return "";
}

/*
==================================================
WARRANTY DURATION
==================================================
*/

function extractWarrantyDuration(
  text
) {
  const patterns = [
    /(?:warranty|guarantee)\s*(?:period|duration|for)?\s*(?:is|:|-)?\s*(\d+(?:\.\d+)?)\s*(days?|months?|years?)/i,

    /(?:warranty|guarantee)\s*(?:of)?\s*(\d+(?:\.\d+)?)\s*(days?|months?|years?)/i,

    /\b(\d+(?:\.\d+)?)\s*(days?|months?|years?)\s*(?:warranty|guarantee)\b/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }

  return "";
}

/*
==================================================
CALCULATE END DATE
==================================================
*/

function calculateWarrantyEndDate(
  startDate,
  duration
) {
  const date =
    parseISODate(
      startDate
    );

  if (!date) {
    return "";
  }

  const match =
    String(duration).match(
      /(\d+(?:\.\d+)?)\s*(day|days|month|months|year|years)/i
    );

  if (!match) {
    return "";
  }

  const amount =
    Number(match[1]);

  const unit =
    match[2].toLowerCase();

  if (
    unit.startsWith("year")
  ) {
    date.setFullYear(
      date.getFullYear() +
        amount
    );
  } else if (
    unit.startsWith("month")
  ) {
    date.setMonth(
      date.getMonth() +
        amount
    );
  } else {
    date.setDate(
      date.getDate() +
        amount
    );
  }

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

/*
==================================================
PARSE ISO DATE
==================================================
*/

function parseISODate(
  value
) {
  const match =
    String(
      value || ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

  if (
    date.getFullYear() !==
      Number(match[1]) ||
    date.getMonth() !==
      Number(match[2]) - 1 ||
    date.getDate() !==
      Number(match[3])
  ) {
    return null;
  }

  return date;
}

/*
==================================================
INVOICE NUMBER
==================================================
*/

function extractInvoiceNumber(
  text
) {
  const directB2C =
    text.match(
      /\b(B2C\/\d{2}-\d{2}\/\d+)\b/i
    );

  if (directB2C) {
    return cleanValue(
      directB2C[1]
    );
  }

  const patterns = [
    /(?:tax\s+invoice|invoice|inv)\s*(?:no|number|num|#|id)?\s*[.:#\-]?\s*([A-Z0-9][A-Z0-9\/._-]{2,})/i,

    /\b([A-Z]{1,8}\/\d{2,4}[-\/]\d{2,4}\/\d{2,})\b/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (!match) {
      continue;
    }

    const value =
      cleanValue(
        match[1]
      );

    if (
      isUsefulInvoiceNumber(
        value
      )
    ) {
      return value;
    }
  }

  return "";
}

/*
==================================================
INVOICE VALIDATION
==================================================
*/

function isUsefulInvoiceNumber(
  value
) {
  if (!value) {
    return false;
  }

  if (
    /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(
      value
    )
  ) {
    return false;
  }

  return (
    value.length >= 3 &&
    value.length <= 80 &&
    /[A-Za-z0-9]/.test(
      value
    )
  );
}

/*
==================================================
SELLER
==================================================
*/

function extractSeller(
  text
) {
  const match =
    text.match(
      /\b(CITY COMPUTER)\b/i
    );

  if (match) {
    return cleanValue(
      match[1]
    );
  }

  const patterns = [
    /(?:seller|dealer|retailer|sold\s*by)\s*(?:is|:|-)\s*([^\n]+)/i,

    /(?:store|shop)\s*(?:is|:|-)\s*([^\n]+)/i,
  ];

  for (
    const pattern of patterns
  ) {
    const found =
      text.match(
        pattern
      );

    if (found) {
      return cleanValue(
        found[1]
      );
    }
  }

  return "";
}

/*
==================================================
SELLER CONTACT
==================================================
*/

function extractSellerContact(
  text
) {
  const sellerIndex =
    text.search(
      /CITY COMPUTER/i
    );

  if (
    sellerIndex >= 0
  ) {
    const sellerSection =
      text.substring(
        sellerIndex,
        sellerIndex + 400
      );

    const phones =
      sellerSection.match(
        /(?:\+91[\s-]?)?\d[\d\s()-]{9,}/g
      );

    if (
      phones &&
      phones.length
    ) {
      return phones
        .map(
          (phone) =>
            phone
              .replace(
                /[^\d+]/g,
                ""
              )
              .trim()
        )
        .filter(
          (phone) =>
            phone.length >= 10
        )
        .join(", ");
    }
  }

  const phones =
    text.match(
      /(?:\+91[\s-]?)?\d[\d\s()-]{9,}/g
    );

  if (
    phones &&
    phones.length
  ) {
    return phones
      .map(
        (phone) =>
          phone
            .replace(
              /[^\d+]/g,
              ""
            )
            .trim()
      )
      .filter(
        (phone) =>
          phone.length >= 10
      )
      .join(", ");
  }

  return "";
}

/*
==================================================
PLACE OF SUPPLY
==================================================
*/

function extractPlaceOfSupply(
  text
) {
  const pattern =
    /(?:place\s+of\s+supply|place\s+of\s+delivery|state\s+of\s+supply)\s*(?:is|:|-)\s*([^\n]+)/i;

  const match =
    text.match(
      pattern
    );

  if (match) {
    return cleanValue(
      match[1]
    );
  }

  return "";
}

/*
==================================================
WARRANTY TYPE
==================================================
*/

function extractWarrantyType(
  text
) {
  if (
    /manufacturer\s+warranty/i.test(
      text
    )
  ) {
    return "Manufacturer Warranty";
  }

  if (
    /third[\s-]?party\s+warranty/i.test(
      text
    )
  ) {
    return "Third-Party Warranty";
  }

  if (
    /extended\s+warranty/i.test(
      text
    )
  ) {
    return "Extended Warranty";
  }

  if (
    /warranty/i.test(
      text
    )
  ) {
    return "Warranty";
  }

  return "";
}

/*
==================================================
PRODUCT EXTRACTION
==================================================
*/

function extractProducts(
  text
) {
  const products = [];

  const lines =
    text
      .split("\n")
      .map(
        (line) =>
          cleanProductLine(
            line
          )
      )
      .filter(Boolean);

  const productStart =
    lines.findIndex(
      (line) =>
        /description\s+of\s+goods/i.test(
          line
        )
    );

  if (
    productStart === -1
  ) {
    return extractProductsFallback(
      lines
    );
  }

  for (
    let i =
      productStart + 1;
    i < lines.length;
    i++
  ) {
    const line =
      lines[i];

    if (
      /^total\b/i.test(
        line
      ) ||
      /^amount chargeable/i.test(
        line
      ) ||
      /^hsn\/sac/i.test(
        line
      )
    ) {
      break;
    }

    const productMatch =
      line.match(
        /^(\d+)[\s.)-]+(.+?)(?=\s+\d{6,8}\b|\s+\d+\s*(?:pcs|bcs|pc|pcs\.)|\s+\d[\d,]*\.\d{2})/i
      );

    if (!productMatch) {
      continue;
    }

    let name =
      cleanProductLine(
        productMatch[2]
      );

    name =
      name
        .replace(
          /\s+\d{6,8}\s*$/,
          ""
        )
        .trim();

    if (
      !isUsefulProductName(
        name
      )
    ) {
      continue;
    }

    const brand =
      detectProductBrand(
        name
      );

    const serialNumbers =
      [];

    for (
      let j = i + 1;
      j <
      Math.min(
        i + 4,
        lines.length
      );
      j++
    ) {
      const nextLine =
        lines[j];

      if (
        /^\d+[\s.)-]+/.test(
          nextLine
        )
      ) {
        break;
      }

      if (
        isSerialLike(
          nextLine
        )
      ) {
        serialNumbers.push(
          nextLine
        );
      } else {
        break;
      }
    }

    products.push({
      productName:
        name,

      brand,

      modelNumber: "",

      serialNumber:
        serialNumbers[0] ||
        "",

      serialNumbers,
    });
  }

  if (
    !products.length
  ) {
    return extractProductsFallback(
      lines
    );
  }

  return removeDuplicateProducts(
    products
  );
}

/*
==================================================
PRODUCT FALLBACK
==================================================
*/

function extractProductsFallback(
  lines
) {
  const products = [];

  const productKeywords = [
    "intel",
    "adata",
    "crucial",
    "zebronics",
    "msi",
    "ant esports",
    "viewsonic",
    "amd",
    "nvidia",
    "samsung",
    "apple",
    "hp",
    "dell",
    "lenovo",
    "asus",
    "acer",
  ];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      lines[i];

    const lower =
      line.toLowerCase();

    if (
      !productKeywords.some(
        (keyword) =>
          lower.includes(
            keyword
          )
      )
    ) {
      continue;
    }

    if (
      !isUsefulProductName(
        line
      )
    ) {
      continue;
    }

    const serialNumbers =
      [];

    for (
      let j = i + 1;
      j <
      Math.min(
        i + 3,
        lines.length
      );
      j++
    ) {
      if (
        isSerialLike(
          lines[j]
        )
      ) {
        serialNumbers.push(
          lines[j]
        );
      }
    }

    products.push({
      productName:
        line,

      brand:
        detectProductBrand(
          line
        ),

      modelNumber: "",

      serialNumber:
        serialNumbers[0] ||
        "",

      serialNumbers,
    });
  }

  return removeDuplicateProducts(
    products
  );
}

/*
==================================================
PRODUCT BRAND
==================================================
*/

function detectProductBrand(
  name
) {
  const brands = [
    "Intel",
    "Adata",
    "Crucial",
    "Zebronics",
    "MSI",
    "ANT",
    "Ant Esports",
    "ViewSonic",
    "Samsung",
    "Apple",
    "Sony",
    "LG",
    "OnePlus",
    "Xiaomi",
    "Redmi",
    "Realme",
    "Oppo",
    "Vivo",
    "Motorola",
    "Dell",
    "HP",
    "Lenovo",
    "Asus",
    "Acer",
    "Whirlpool",
    "Bosch",
    "IFB",
    "Haier",
    "Voltas",
    "Panasonic",
    "Philips",
    "Canon",
    "Nikon",
    "JBL",
    "Boat",
    "Bose",
  ];

  for (
    const brand of brands
  ) {
    const regex =
      new RegExp(
        `\\b${escapeRegex(
          brand
        )}\\b`,
        "i"
      );

    if (
      regex.test(name)
    ) {
      return brand;
    }
  }

  return "";
}

/*
==================================================
SERIAL DETECTION
==================================================
*/

function isSerialLike(
  value
) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return false;
  }

  if (
    text.length < 5 ||
    text.length > 40
  ) {
    return false;
  }

  if (
    !/[A-Za-z0-9]/.test(
      text
    )
  ) {
    return false;
  }

  if (
    /\s{2,}/.test(
      text
    )
  ) {
    return false;
  }

  return (
    /\d/.test(text) &&
    !/^(total|subtotal|amount|tax|gst)/i.test(
      text
    )
  );
}

/*
==================================================
CATEGORY
==================================================
*/

function detectCategory(
  productName,
  brand,
  model,
  text
) {
  const value =
    `${productName} ${brand} ${model} ${text}`
      .toLowerCase();

  if (
    /iphone|ipad|phone|mobile|smartphone|laptop|computer|desktop|tv|television|monitor|tablet|camera|headphone|earphone|earbuds|smartwatch|printer|router|keyboard|mouse|graphics card|motherboard|cpu|ram|nvme|ssd|smps|cabinet/.test(
      value
    )
  ) {
    return "Electronics";
  }

  if (
    /fridge|refrigerator|microwave|oven|mixer|grinder|kitchen|air conditioner|washing machine|dishwasher|vacuum cleaner/.test(
      value
    )
  ) {
    return "Home & Kitchen";
  }

  if (
    /sofa|chair|table|bed|wardrobe|furniture|desk/.test(
      value
    )
  ) {
    return "Furniture";
  }

  if (
    /ring|necklace|bracelet|earring|jewelry|jewellery/.test(
      value
    )
  ) {
    return "Jewelry";
  }

  if (
    /car|vehicle|automobile/.test(
      value
    )
  ) {
    return "Vehicle / Car";
  }

  if (
    /bike|motorcycle|scooter/.test(
      value
    )
  ) {
    return "Bike / Motorcycle";
  }

  if (
    /drill|hammer|tool|machine|power tool/.test(
      value
    )
  ) {
    return "Tools";
  }

  if (
    /shirt|tshirt|t-shirt|jeans|jacket|shoe|shoes|clothing|dress/.test(
      value
    )
  ) {
    return "Clothing";
  }

  return "Other";
}

/*
==================================================
REMOVE DUPLICATES
==================================================
*/

function removeDuplicateProducts(
  products
) {
  const unique = [];

  const seen =
    new Set();

  for (
    const product of products
  ) {
    const key =
      String(
        product.productName ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(
      product
    );
  }

  return unique;
}

/*
==================================================
CLEAN VALUE
==================================================
*/

function cleanValue(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .replace(
      /^[\s:;,.-]+/,
      ""
    )
    .replace(
      /[\s:;,.-]+$/,
      ""
    )
    .trim();
}

/*
==================================================
CLEAN PRODUCT
==================================================
*/

function cleanProductLine(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .replace(
      /^[\s:;,.-]+/,
      ""
    )
    .replace(
      /[\s:;,.-]+$/,
      ""
    )
    .trim();
}

/*
==================================================
PRODUCT VALIDATION
==================================================
*/

function isUsefulProductName(
  value
) {
  if (!value) {
    return false;
  }

  const lower =
    value.toLowerCase();

  const ignored = [
    "invoice",
    "tax invoice",
    "bill",
    "description",
    "product",
    "product name",
    "item",
    "item name",
    "date",
    "total",
    "subtotal",
    "amount",
    "gst",
    "gstin",
    "quantity",
    "price",
    "warranty",
    "guarantee",
    "customer",
    "seller",
    "dealer",
    "retailer",
    "address",
    "phone",
    "mobile",
    "email",
    "invoice no",
    "invoice number",
    "hsn/sac",
  ];

  if (
    ignored.includes(
      lower
    )
  ) {
    return false;
  }

  return (
    value.length >= 4 &&
    value.length <= 100 &&
    /[A-Za-z]/.test(
      value
    )
  );
}

/*
==================================================
ESCAPE REGEX
==================================================
*/

function escapeRegex(
  value
) {
  return String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

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

