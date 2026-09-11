
import {
  Archive,
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileImage,
  FileText,
  FolderOpen,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
  Eye,
  RefreshCw,
  Package,
  AlertTriangle,
  CircleCheck,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext.jsx";

import {
  saveWarrantyDocument,
  getWarrantyDocument,
  deleteWarrantyDocument,
  createDocumentUrl,
} from "../../untils/warrantyDocumentStore.js";

const API_URL =
  "http://localhost:5000/api";

const WARRANTY_STORAGE_KEY =
  "warranty_vault_warranties";

const DOCUMENT_META_KEY =
  "warranty_vault_document_meta";

const OVERRIDE_KEY =
  "warranty_vault_overrides";

/*
============================================================
DOCUMENT SECTION DELETE STORAGE
============================================================
*/

const DOCUMENT_SECTION_DELETE_KEY =
  "warranty_vault_document_sections_deleted";

const readDeletedDocumentSections = () => {
  try {
    const stored =
      localStorage.getItem(
        DOCUMENT_SECTION_DELETE_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch (error) {
    console.error(
      "Unable to read deleted document sections:",
      error
    );

    return [];
  }
};

const saveDeletedDocumentSections = (
  ids
) => {
  try {
    localStorage.setItem(
      DOCUMENT_SECTION_DELETE_KEY,
      JSON.stringify(
        Array.from(
          new Set(
            ids.map(String)
          )
        )
      )
    );
  } catch (error) {
    console.error(
      "Unable to save deleted document sections:",
      error
    );
  }
};

/*
============================================================
LOCAL DOCUMENT METADATA
============================================================
*/

const readDocumentMeta = () => {
  try {
    const stored =
      localStorage.getItem(
        DOCUMENT_META_KEY
      );

    if (!stored) {
      return {};
    }

    const parsed =
      JSON.parse(
        stored
      );

    return parsed &&
      typeof parsed ===
        "object"
      ? parsed
      : {};
  } catch (error) {
    console.error(
      "Unable to read document metadata:",
      error
    );

    return {};
  }
};

const saveDocumentMeta = (
  warrantyId,
  metadata
) => {
  try {
    const current =
      readDocumentMeta();

    current[
      String(warrantyId)
    ] = metadata;

    localStorage.setItem(
      DOCUMENT_META_KEY,
      JSON.stringify(
        current
      )
    );
  } catch (error) {
    console.error(
      "Unable to save document metadata:",
      error
    );
  }
};

const removeDocumentMeta = (
  warrantyId
) => {
  try {
    const current =
      readDocumentMeta();

    delete current[
      String(warrantyId)
    ];

    localStorage.setItem(
      DOCUMENT_META_KEY,
      JSON.stringify(
        current
      )
    );
  } catch (error) {
    console.error(
      "Unable to remove document metadata:",
      error
    );
  }
};

/*
============================================================
PRODUCT OVERRIDES
============================================================
*/

const readOverrides = () => {
  try {
    const stored =
      localStorage.getItem(
        OVERRIDE_KEY
      );

    if (!stored) {
      return {
        updated: {},
        deleted: [],
      };
    }

    const parsed =
      JSON.parse(
        stored
      );

    return {
      updated:
        parsed?.updated &&
        typeof parsed.updated ===
          "object"
          ? parsed.updated
          : {},

      deleted:
        Array.isArray(
          parsed?.deleted
        )
          ? parsed.deleted.map(
              String
            )
          : [],
    };
  } catch (error) {
    console.error(
      "Unable to read warranty overrides:",
      error
    );

    return {
      updated: {},
      deleted: [],
    };
  }
};

/*
============================================================
LEGACY LOCAL STORAGE
============================================================
*/

const readLegacyWarranties =
  () => {
    try {
      const stored =
        localStorage.getItem(
          WARRANTY_STORAGE_KEY
        );

      if (!stored) {
        return [];
      }

      const parsed =
        JSON.parse(
          stored
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch (error) {
      console.error(
        "Unable to read legacy warranty storage:",
        error
      );

      return [];
    }
  };

/*
============================================================
NORMALIZE WARRANTY
============================================================
*/

const normalizeWarranty =
  (
    product,
    index = 0
  ) => {
    const id =
      product?._id ||
      product?.id ||
      `warranty-${product?.savedAt || index}`;

    return {
      ...product,

      id:
        String(id),

      productName:
        product?.productName ||
        product?.name ||
        "Unnamed Product",

      name:
        product?.name ||
        product?.productName ||
        "Unnamed Product",

      fileName:
        product?.fileName ||
        "",

      fileType:
        product?.fileType ||
        "",

      fileSize:
        product?.fileSize ||
        null,

      fileData:
        typeof product?.fileData ===
        "string"
          ? product.fileData
          : "",

      documentUploadedAt:
        product?.documentUploadedAt ||
        null,

      savedAt:
        product?.savedAt ||
        product?.createdAt ||
        null,
    };
  };

/*
============================================================
MERGE SERVER + LEGACY DATA
============================================================
*/

const mergeWarrantyData = (
  serverWarranties,
  legacyWarranties
) => {
  const merged =
    new Map();

  /*
  --------------------------------------------
  SERVER DATA FIRST
  --------------------------------------------
  */

  serverWarranties.forEach(
    (
      warranty,
      index
    ) => {
      const normalized =
        normalizeWarranty(
          warranty,
          index
        );

      merged.set(
        normalized.id,
        normalized
      );
    }
  );

  /*
  --------------------------------------------
  LEGACY DATA
  --------------------------------------------
  */

  legacyWarranties.forEach(
    (
      warranty,
      index
    ) => {
      const normalized =
        normalizeWarranty(
          warranty,
          index
        );

      const existing =
        merged.get(
          normalized.id
        );

      if (existing) {
        if (
          !existing.fileName &&
          normalized.fileName
        ) {
          existing.fileName =
            normalized.fileName;
        }

        if (
          !existing.fileType &&
          normalized.fileType
        ) {
          existing.fileType =
            normalized.fileType;
        }

        if (
          !existing.fileData &&
          normalized.fileData
        ) {
          existing.fileData =
            normalized.fileData;
        }

        if (
          !existing.fileSize &&
          normalized.fileSize
        ) {
          existing.fileSize =
            normalized.fileSize;
        }

        if (
          !existing.documentUploadedAt &&
          normalized.documentUploadedAt
        ) {
          existing.documentUploadedAt =
            normalized.documentUploadedAt;
        }
      } else {
        merged.set(
          normalized.id,
          normalized
        );
      }
    }
  );

  return Array.from(
    merged.values()
  );
};

/*
============================================================
APPLY PRODUCT OVERRIDES
============================================================
*/

const applyProductOverrides = (
  list
) => {
  const overrides =
    readOverrides();

  return list
    .map(
      (
        item
      ) => {
        const id =
          String(
            item?._id ||
              item?.id ||
              ""
          );

        if (
          overrides.updated[
            id
          ]
        ) {
          return {
            ...item,

            ...overrides.updated[
              id
            ],
          };
        }

        return item;
      }
    )
    .filter(
      (
        item
      ) => {
        const id =
          String(
            item?._id ||
              item?.id ||
              ""
          );

        return !overrides.deleted.includes(
          id
        );
      }
    );
};

/*
============================================================
SAFE DATE PARSER
============================================================
*/

const parseDateValue = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return Number.isNaN(
      value.getTime()
    )
      ? null
      : new Date(
          value
        );
  }

  const text =
    String(
      value
    ).trim();

  if (!text) {
    return null;
  }

  /*
  YYYY-MM-DD
  */

  const dateOnlyMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (
    dateOnlyMatch
  ) {
    const year =
      Number(
        dateOnlyMatch[1]
      );

    const month =
      Number(
        dateOnlyMatch[2]
      );

    const day =
      Number(
        dateOnlyMatch[3]
      );

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
      return null;
    }

    return date;
  }

  /*
  ISO datetime from MongoDB
  */

  const parsed =
    new Date(
      text
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
};

/*
============================================================
FORMAT DATE
============================================================
*/

const formatDateValue = (
  value
) => {
  const date =
    parseDateValue(
      value
    );

  if (!date) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

/*
============================================================
GET WARRANTY INFO
============================================================
*/

const getWarrantyInfoValue =
  (
    product
  ) => {
    const endDate =
      parseDateValue(
        product?.warrantyEndDate
      );

    if (!endDate) {
      return {
        daysLeft: null,
        status: "Unknown",
        statusType: "unknown",
      };
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    endDate.setHours(
      0,
      0,
      0,
      0
    );

    const difference =
      endDate.getTime() -
      today.getTime();

    const daysLeft =
      Math.ceil(
        difference /
          (1000 *
            60 *
            60 *
            24)
      );

    if (
      daysLeft < 0
    ) {
      return {
        daysLeft,
        status: "Expired",
        statusType: "expired",
      };
    }

    if (
      daysLeft <= 3
    ) {
      return {
        daysLeft,
        status: "Critical",
        statusType: "urgent",
      };
    }

    if (
      daysLeft <= 30
    ) {
      return {
        daysLeft,
        status: "Ending Soon",
        statusType: "warning",
      };
    }

    return {
      daysLeft,
      status: "Protected",
      statusType: "active",
    };
  };

/*
============================================================
DOCUMENT HELPERS
============================================================
*/

const getProductNameValue =
  (
    product
  ) => {
    return (
      product?.productName ||
      product?.name ||
      "Unnamed Product"
    );
  };

const isImageFileValue =
  (
    product
  ) => {
    if (!product) {
      return false;
    }

    const type =
      product?.fileType ||
      "";

    if (
      type.startsWith(
        "image/"
      )
    ) {
      return true;
    }

    const fileName =
      product?.fileName
        ?.toLowerCase() ||
      "";

    return /\.(jpg|jpeg|png|gif|webp|bmp|heic|svg)$/i.test(
      fileName
    );
  };

const isPdfFileValue =
  (
    product
  ) => {
    if (!product) {
      return false;
    }

    if (
      product?.fileType ===
      "application/pdf"
    ) {
      return true;
    }

    const fileName =
      product?.fileName
        ?.toLowerCase() ||
      "";

    return fileName.endsWith(
      ".pdf"
    );
  };

const hasDocumentValue =
  (
    product
  ) => {
    return Boolean(
      product?.fileName ||
        product?.fileData ||
        product?.documentUrl
    );
  };

/*
============================================================
COMPONENT
============================================================
*/

function Protection() {
  const navigate =
    useNavigate();

  const {
    token,
  } = useAuth();

  /*
  ==========================================================
  STATE
  ==========================================================
  */

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    documentUrls,
    setDocumentUrls,
  ] = useState({});

  const [
    uploadingProductId,
    setUploadingProductId,
  ] = useState(null);

  const [
    isUploadOpen,
    setIsUploadOpen,
  ] = useState(false);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    viewingProduct,
    setViewingProduct,
  ] = useState(null);

  const [
    viewingUrl,
    setViewingUrl,
  ] = useState("");

  const [
    warrantyDetailsProduct,
    setWarrantyDetailsProduct,
  ] = useState(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  const [
    sortBy,
    setSortBy,
  ] = useState("expiry");

  const [
    showSortMenu,
    setShowSortMenu,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const fileInputRef =
    useRef(null);

  /*
  ==========================================================
  LOAD ONE DOCUMENT
  ==========================================================
  */

  const loadDocumentForProduct =
    useCallback(
      async (
        product
      ) => {
        if (
          !product?.id
        ) {
          return product;
        }

        try {
          /*
          -----------------------------------------------
          LEGACY BASE64 DOCUMENT
          -----------------------------------------------
          */

          if (
            product.fileData
          ) {
            setDocumentUrls(
              (
                previous
              ) => ({
                ...previous,
                [product.id]:
                  product.fileData,
              })
            );

            return product;
          }

          /*
          -----------------------------------------------
          CURRENT INDEXEDDB DOCUMENT
          -----------------------------------------------
          */

          const record =
            await getWarrantyDocument(
              product.id
            );

          if (
            !record?.file
          ) {
            return product;
          }

          const fileName =
            record.fileName ||
            "";

          const fileType =
            record.fileType ||
            record.file?.type ||
            "";

          const fileSize =
            record.fileSize ??
            record.file?.size ??
            null;

          const documentUploadedAt =
            record.savedAt ||
            null;

          /*
          Load image preview.
          PDF is loaded only when opened.
          */

          if (
            fileType.startsWith(
              "image/"
            )
          ) {
            const url =
              createDocumentUrl(
                record
              );

            if (url) {
              setDocumentUrls(
                (
                  previous
                ) => {
                  const oldUrl =
                    previous[
                      product.id
                    ];

                  if (
                    oldUrl &&
                    oldUrl.startsWith(
                      "blob:"
                    )
                  ) {
                    URL.revokeObjectURL(
                      oldUrl
                    );
                  }

                  return {
                    ...previous,
                    [product.id]:
                      url,
                  };
                }
              );
            }
          }

          return {
            ...product,

            fileName:
              fileName ||
              product.fileName ||
              "",

            fileType:
              fileType ||
              product.fileType ||
              "",

            fileSize:
              fileSize ||
              product.fileSize ||
              null,

            documentUploadedAt:
              documentUploadedAt ||
              product.documentUploadedAt ||
              null,
          };
        } catch (error) {
          console.error(
            "Unable to load document for product:",
            error
          );

          return product;
        }
      },
      []
    );

  /*
  ==========================================================
  LOAD PRODUCTS
  ==========================================================
  */

  const loadProducts =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true
          );

          /*
          ----------------------------------------------------
          GET SERVER WARRANTIES
          ----------------------------------------------------
          */

          let serverWarranties =
            [];

          if (token) {
            try {
              const response =
                await fetch(
                  `${API_URL}/warranty`,
                  {
                    method:
                      "GET",

                    headers: {
                      Authorization:
                        `Bearer ${token}`,
                    },

                    cache:
                      "no-store",
                  }
                );

              const data =
                await response.json();

              if (
                response.ok &&
                data.success &&
                Array.isArray(
                  data.warranties
                )
              ) {
                serverWarranties =
                  data.warranties;
              }
            } catch (
              serverError
            ) {
              console.error(
                "Unable to load warranties from server:",
                serverError
              );
            }
          }

          /*
          ----------------------------------------------------
          LEGACY LOCAL DATA
          ----------------------------------------------------
          */

          const legacyWarranties =
            readLegacyWarranties();

          /*
          ----------------------------------------------------
          MERGE SERVER + LEGACY
          ----------------------------------------------------
          */

          let merged =
            mergeWarrantyData(
              serverWarranties,
              legacyWarranties
            );

          /*
          ----------------------------------------------------
          APPLY PRODUCT PAGE DELETE / EDIT STATE
          ----------------------------------------------------
          */

          merged =
            applyProductOverrides(
              merged
            );

          /*
          ----------------------------------------------------
          REMOVE DOCUMENT SECTIONS THAT WERE DELETED
          ----------------------------------------------------
          */

          const deletedDocumentSections =
            readDeletedDocumentSections();

          merged =
            merged.filter(
              (
                product
              ) =>
                !deletedDocumentSections.includes(
                  String(
                    product?.id ||
                      product?._id ||
                      ""
                  )
                )
            );

          /*
          ----------------------------------------------------
          SORT NEWEST FIRST
          ----------------------------------------------------
          */

          merged.sort(
            (
              a,
              b
            ) => {
              const aDate =
                parseDateValue(
                  a?.savedAt
                );

              const bDate =
                parseDateValue(
                  b?.savedAt
                );

              return (
                (
                  bDate?.getTime() ||
                  0
                ) -
                (
                  aDate?.getTime() ||
                  0
                )
              );
            }
          );

          /*
          ----------------------------------------------------
          LOAD DOCUMENTS
          ----------------------------------------------------
          */

          const loadedProducts =
            await Promise.all(
              merged.map(
                (
                  product
                ) =>
                  loadDocumentForProduct(
                    product
                  )
              )
            );

          /*
          ----------------------------------------------------
          SAVE PRODUCTS
          ----------------------------------------------------
          */

          setProducts(
            loadedProducts
          );
        } catch (error) {
          console.error(
            "Unable to load vault data:",
            error
          );

          setProducts([]);
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        token,
        loadDocumentForProduct,
      ]
    );

  /*
  ==========================================================
  LISTEN FOR PRODUCT CHANGES
  ==========================================================
  */

  useEffect(() => {
    loadProducts();

    const handleWarrantyUpdate =
      () => {
        loadProducts();
      };

    const handleStorageChange =
      (
        event
      ) => {
        if (
          event.key ===
            WARRANTY_STORAGE_KEY ||
          event.key ===
            DOCUMENT_META_KEY ||
          event.key ===
            OVERRIDE_KEY ||
          event.key ===
            DOCUMENT_SECTION_DELETE_KEY
        ) {
          loadProducts();
        }
      };

    window.addEventListener(
      "warrantyVaultUpdated",
      handleWarrantyUpdate
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "warrantyVaultUpdated",
        handleWarrantyUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, [
    loadProducts,
  ]);

  /*
  ==========================================================
  REVOKE OBJECT URLS
  ==========================================================
  */

  useEffect(() => {
    return () => {
      Object.values(
        documentUrls
      ).forEach(
        (
          url
        ) => {
          if (
            typeof url ===
              "string" &&
            url.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              url
            );
          }
        }
      );
    };
  }, [
    documentUrls,
  ]);

  /*
  ==========================================================
  WARRANTY INFO
  ==========================================================
  */

  const getWarrantyInfo =
    useCallback(
      (
        product
      ) => {
        return getWarrantyInfoValue(
          product
        );
      },
      []
    );

  /*
  ==========================================================
  PRODUCT NAME
  ==========================================================
  */

  const getProductName =
    useCallback(
      (
        product
      ) => {
        return getProductNameValue(
          product
        );
      },
      []
    );

  /*
  ==========================================================
  FORMAT DATE
  ==========================================================
  */

  const formatDate =
    useCallback(
      (
        date
      ) => {
        return formatDateValue(
          date
        );
      },
      []
    );

  /*
  ==========================================================
  DOCUMENT URL
  ==========================================================
  */

  const getDocumentUrl =
    useCallback(
      (
        product
      ) => {
        if (
          !product?.id
        ) {
          return "";
        }

        if (
          product.fileData
        ) {
          return product.fileData;
        }

        if (
          documentUrls[
            product.id
          ]
        ) {
          return documentUrls[
            product.id
          ];
        }

        if (
          product.documentUrl
        ) {
          return product.documentUrl;
        }

        return "";
      },
      [
        documentUrls,
      ]
    );

  /*
  ==========================================================
  STATISTICS
  ==========================================================
  */

  const statistics =
    useMemo(
      () => {
        let active = 0;
        let endingSoon = 0;
        let critical = 0;
        let expired = 0;
        let unknown = 0;

        products.forEach(
          (
            product
          ) => {
            const info =
              getWarrantyInfo(
                product
              );

            if (
              info.statusType ===
              "active"
            ) {
              active++;
            }

            if (
              info.statusType ===
              "warning"
            ) {
              endingSoon++;
            }

            if (
              info.statusType ===
              "urgent"
            ) {
              critical++;
            }

            if (
              info.statusType ===
              "expired"
            ) {
              expired++;
            }

            if (
              info.statusType ===
              "unknown"
            ) {
              unknown++;
            }
          }
        );

        return {
          active,
          endingSoon,
          critical,
          expired,
          unknown,
          total:
            products.length,
        };
      },
      [
        products,
        getWarrantyInfo,
      ]
    );

  /*
  ==========================================================
  DOCUMENT COUNT
  ==========================================================
  */

  const documentCount =
    useMemo(
      () => {
        return products.filter(
          (
            product
          ) =>
            hasDocumentValue(
              product
            )
        ).length;
      },
      [
        products,
      ]
    );

  /*
  ==========================================================
  SEARCH + FILTER + SORT
  ==========================================================
  */

  const filteredProducts =
    useMemo(
      () => {
        let result =
          products;

        const query =
          searchQuery
            .trim()
            .toLowerCase();

        if (query) {
          result =
            result.filter(
              (
                product
              ) => {
                const name =
                  getProductName(
                    product
                  ).toLowerCase();

                const brand =
                  product?.brand
                    ?.toLowerCase() ||
                  "";

                const category =
                  product?.category
                    ?.toLowerCase() ||
                  "";

                const fileName =
                  product?.fileName
                    ?.toLowerCase() ||
                  "";

                const serial =
                  product?.serialNumber
                    ?.toLowerCase() ||
                  "";

                return (
                  name.includes(
                    query
                  ) ||
                  brand.includes(
                    query
                  ) ||
                  category.includes(
                    query
                  ) ||
                  fileName.includes(
                    query
                  ) ||
                  serial.includes(
                    query
                  )
                );
              }
            );
        }

        if (
          activeFilter !==
          "all"
        ) {
          result =
            result.filter(
              (
                product
              ) => {
                const status =
                  getWarrantyInfo(
                    product
                  ).statusType;

                if (
                  activeFilter ===
                  "protected"
                ) {
                  return (
                    status ===
                    "active"
                  );
                }

                if (
                  activeFilter ===
                  "ending"
                ) {
                  return (
                    status ===
                    "warning"
                  );
                }

                if (
                  activeFilter ===
                  "critical"
                ) {
                  return (
                    status ===
                    "urgent"
                  );
                }

                if (
                  activeFilter ===
                  "expired"
                ) {
                  return (
                    status ===
                    "expired"
                  );
                }

                if (
                  activeFilter ===
                  "unknown"
                ) {
                  return (
                    status ===
                    "unknown"
                  );
                }

                return true;
              }
            );
        }

        const sorted =
          [
            ...result,
          ];

        sorted.sort(
          (
            a,
            b
          ) => {
            const infoA =
              getWarrantyInfo(
                a
              );

            const infoB =
              getWarrantyInfo(
                b
              );

            if (
              sortBy ===
              "name"
            ) {
              return getProductName(
                a
              ).localeCompare(
                getProductName(
                  b
                )
              );
            }

            if (
              sortBy ===
              "recent"
            ) {
              return (
                (
                  parseDateValue(
                    b?.savedAt
                  )?.getTime() ||
                  0
                ) -
                (
                  parseDateValue(
                    a?.savedAt
                  )?.getTime() ||
                  0
                )
              );
            }

            if (
              sortBy ===
              "documents"
            ) {
              return (
                Number(
                  hasDocumentValue(
                    b
                  )
                ) -
                Number(
                  hasDocumentValue(
                    a
                  )
                )
              );
            }

            if (
              typeof infoA.daysLeft !==
                "number" &&
              typeof infoB.daysLeft !==
                "number"
            ) {
              return 0;
            }

            if (
              typeof infoA.daysLeft !==
              "number"
            ) {
              return 1;
            }

            if (
              typeof infoB.daysLeft !==
              "number"
            ) {
              return -1;
            }

            return (
              infoA.daysLeft -
              infoB.daysLeft
            );
          }
        );

        return sorted;
      },
      [
        products,
        searchQuery,
        activeFilter,
        sortBy,
        getWarrantyInfo,
        getProductName,
      ]
    );

  /*
  ==========================================================
  OPEN UPLOAD
  ==========================================================
  */

  const openUploadForProduct =
    useCallback(
      (
        product
      ) => {
        if (
          !product?.id
        ) {
          alert(
            "Unable to select this warranty."
          );

          return;
        }

        setSelectedProduct(
          product
        );

        setIsUploadOpen(
          true
        );
      },
      []
    );

  /*
  ==========================================================
  DOWNLOAD FILE
  ==========================================================
  */

  const downloadFile =
    useCallback(
      async (
        product
      ) => {
        if (
          !product?.id
        ) {
          return;
        }

        try {
          let url =
            getDocumentUrl(
              product
            );

          let temporaryUrl =
            "";

          let documentFileName =
            product?.fileName ||
            "";

          /*
          -----------------------------------------------
          CHECK SHARED DOCUMENT STORE
          -----------------------------------------------
          */

          if (
            !url ||
            !documentFileName
          ) {
            const record =
              await getWarrantyDocument(
                product.id
              );

            if (
              record?.file
            ) {
              if (!url) {
                temporaryUrl =
                  createDocumentUrl(
                    record
                  );

                url =
                  temporaryUrl;
              }

              documentFileName =
                record.fileName ||
                documentFileName;
            }
          }

          if (!url) {
            alert(
              "The original document is not available yet. Please upload the document first."
            );

            openUploadForProduct(
              product
            );

            return;
          }

          const link =
            document.createElement(
              "a"
            );

          link.href =
            url;

          link.download =
            documentFileName ||
            `${getProductName(
              product
            )}-document`;

          link.target =
            "_blank";

          link.rel =
            "noopener noreferrer";

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          if (
            temporaryUrl
          ) {
            URL.revokeObjectURL(
              temporaryUrl
            );
          }
        } catch (error) {
          console.error(
            "Unable to download file:",
            error
          );

          alert(
            "Unable to download this document."
          );
        }
      },
      [
        getDocumentUrl,
        getProductName,
        openUploadForProduct,
      ]
    );

  /*
  ==========================================================
  OPEN DOCUMENT
  ==========================================================
  */

  const viewDocument =
    useCallback(
      async (
        product
      ) => {
        if (
          !product?.id
        ) {
          return;
        }

        try {
          let url =
            getDocumentUrl(
              product
            );

          let temporaryUrl =
            "";

          /*
          -----------------------------------------------
          LOAD SHARED DOCUMENT WHEN NEEDED
          -----------------------------------------------
          */

          if (!url) {
            const record =
              await getWarrantyDocument(
                product.id
              );

            if (
              record?.file
            ) {
              temporaryUrl =
                createDocumentUrl(
                  record
                );

              url =
                temporaryUrl;
            }
          }

          if (!url) {
            openUploadForProduct(
              product
            );

            return;
          }

          /*
          -----------------------------------------------
          CLOSE PREVIOUS BLOB URL
          -----------------------------------------------
          */

          if (
            viewingUrl &&
            viewingUrl.startsWith(
              "blob:"
            )
          ) {
            const previousCardUrl =
              viewingProduct?.id
                ? documentUrls[
                    viewingProduct.id
                  ]
                : "";

            if (
              viewingUrl !==
              previousCardUrl
            ) {
              URL.revokeObjectURL(
                viewingUrl
              );
            }
          }

          setViewingUrl(
            url
          );

          setViewingProduct(
            product
          );
        } catch (error) {
          console.error(
            "Unable to open document:",
            error
          );

          alert(
            "Unable to open this document."
          );
        }
      },
      [
        getDocumentUrl,
        viewingUrl,
        viewingProduct,
        documentUrls,
        openUploadForProduct,
      ]
    );

  /*
  ==========================================================
  CLOSE DOCUMENT VIEWER
  ==========================================================
  */

  const closeDocumentViewer =
    useCallback(
      () => {
        if (
          viewingUrl &&
          viewingUrl.startsWith(
            "blob:"
          )
        ) {
          const cardUrl =
            viewingProduct?.id
              ? documentUrls[
                  viewingProduct.id
                ]
              : "";

          if (
            viewingUrl !==
            cardUrl
          ) {
            URL.revokeObjectURL(
              viewingUrl
            );
          }
        }

        setViewingProduct(
          null
        );

        setViewingUrl(
          ""
        );
      },
      [
        viewingUrl,
        viewingProduct,
        documentUrls,
      ]
    );

  /*
  ==========================================================
  DELETE COMPLETE DOCUMENT SECTION
  ==========================================================
  */

  const deleteDocument =
    useCallback(
      async (
        product
      ) => {
        const warrantyId =
          String(
            product?._id ||
              product?.id ||
              ""
          );

        if (!warrantyId) {
          alert(
            "Unable to identify this document."
          );

          return;
        }

        const productName =
          product?.productName ||
          product?.name ||
          "this product";

        const confirmed =
          window.confirm(
            `Are you sure you want to delete the complete document section for "${productName}"?\n\nThis will remove this entire section from Documents, including its image, information and document controls.\n\nThe product and warranty will remain saved in Products.`
          );

        if (!confirmed) {
          return;
        }

        try {
          /*
          -----------------------------------------------
          1. DELETE ORIGINAL DOCUMENT
          -----------------------------------------------
          */

          await deleteWarrantyDocument(
            warrantyId
          );

          /*
          -----------------------------------------------
          2. DELETE DOCUMENT METADATA
          -----------------------------------------------
          */

          removeDocumentMeta(
            warrantyId
          );

          /*
          -----------------------------------------------
          3. REMEMBER THAT THIS COMPLETE DOCUMENT
             SECTION WAS DELETED
          -----------------------------------------------
          */

          const deletedSections =
            readDeletedDocumentSections();

          if (
            !deletedSections.includes(
              warrantyId
            )
          ) {
            deletedSections.push(
              warrantyId
            );
          }

          saveDeletedDocumentSections(
            deletedSections
          );

          /*
          -----------------------------------------------
          4. REMOVE IMAGE / DOCUMENT OBJECT URL
          -----------------------------------------------
          */

          setDocumentUrls(
            (
              previous
            ) => {
              const next = {
                ...previous,
              };

              const oldUrl =
                next[
                  warrantyId
                ];

              if (
                oldUrl &&
                oldUrl.startsWith(
                  "blob:"
                )
              ) {
                try {
                  URL.revokeObjectURL(
                    oldUrl
                  );
                } catch (
                  revokeError
                ) {
                  console.error(
                    "Unable to revoke document URL:",
                    revokeError
                  );
                }
              }

              delete next[
                warrantyId
              ];

              return next;
            }
          );

          /*
          -----------------------------------------------
          5. REMOVE THE COMPLETE CARD FROM
             DOCUMENTS PAGE
          -----------------------------------------------
          */

          setProducts(
            (
              previous
            ) =>
              previous.filter(
                (
                  item
                ) =>
                  String(
                    item?._id ||
                      item?.id ||
                      ""
                  ) !==
                  warrantyId
              )
          );

          /*
          -----------------------------------------------
          6. CLOSE DOCUMENT VIEWER
          -----------------------------------------------
          */

          if (
            viewingProduct &&
            String(
              viewingProduct?._id ||
                viewingProduct?.id ||
                ""
            ) === warrantyId
          ) {
            closeDocumentViewer();
          }

          /*
          -----------------------------------------------
          7. CLOSE UPLOAD MODAL IF THIS PRODUCT
             IS THE CURRENTLY SELECTED ONE
          -----------------------------------------------
          */

          if (
            selectedProduct &&
            String(
              selectedProduct?._id ||
                selectedProduct?.id ||
                ""
            ) === warrantyId
          ) {
            setIsUploadOpen(
              false
            );

            setSelectedProduct(
              null
            );

            if (
              fileInputRef.current
            ) {
              fileInputRef.current.value =
                "";
            }
          }

          /*
          -----------------------------------------------
          8. CLOSE WARRANTY DETAILS MODAL IF
             THIS PRODUCT IS OPEN
          -----------------------------------------------
          */

          if (
            warrantyDetailsProduct &&
            String(
              warrantyDetailsProduct?._id ||
                warrantyDetailsProduct?.id ||
                ""
            ) === warrantyId
          ) {
            setWarrantyDetailsProduct(
              null
            );
          }

          /*
          -----------------------------------------------
          9. UPDATE OTHER CONNECTED UI
          -----------------------------------------------
          */

          window.dispatchEvent(
            new Event(
              "warrantyVaultUpdated"
            )
          );

          alert(
            "The complete document section was deleted successfully. The product warranty is still saved in Products."
          );
        } catch (error) {
          console.error(
            "Unable to delete complete document section:",
            error
          );

          alert(
            "Unable to delete this document section. Please try again."
          );
        }
      },
      [
        viewingProduct,
        closeDocumentViewer,
        selectedProduct,
        warrantyDetailsProduct,
      ]
    );

  /*
  ==========================================================
  OPEN WARRANTY DETAILS
  ==========================================================
  */

  const openProduct =
    useCallback(
      (
        product
      ) => {
        if (!product) {
          alert(
            "Warranty information could not be opened."
          );

          return;
        }

        setWarrantyDetailsProduct(
          product
        );
      },
      []
    );

  /*
  ==========================================================
  CLOSE WARRANTY DETAILS
  ==========================================================
  */

  const closeWarrantyDetails =
    useCallback(
      () => {
        setWarrantyDetailsProduct(
          null
        );
      },
      []
    );

  /*
  ==========================================================
  CLOSE UPLOAD
  ==========================================================
  */

  const closeUpload =
    useCallback(
      () => {
        setIsUploadOpen(
          false
        );

        setSelectedProduct(
          null
        );

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      },
      []
    );

  /*
  ==========================================================
  DOCUMENT UPLOAD / REPLACE
  ==========================================================
  */

  const handleDocumentUpload =
    async (
      event
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      /*
      -----------------------------------------------
      CHECK FILE TYPE
      -----------------------------------------------
      */

      if (
        !file.type.startsWith(
          "image/"
        ) &&
        file.type !==
          "application/pdf"
      ) {
        alert(
          "Please upload an image or PDF document."
        );

        event.target.value =
          "";

        return;
      }

      /*
      -----------------------------------------------
      CHECK PRODUCT
      -----------------------------------------------
      */

      if (
        !selectedProduct?.id
      ) {
        alert(
          "Warranty could not be found."
        );

        event.target.value =
          "";

        return;
      }

      const warrantyId =
        String(
          selectedProduct.id
        );

      try {
        setUploadingProductId(
          warrantyId
        );

        /*
        -----------------------------------------------
        SAVE TO SHARED DOCUMENT STORE
        -----------------------------------------------
        */

        await saveWarrantyDocument(
          warrantyId,
          file
        );

        /*
        -----------------------------------------------
        IF THIS DOCUMENT SECTION WAS PREVIOUSLY
        DELETED, ALLOW IT TO EXIST AGAIN.
        -----------------------------------------------
        */

        const deletedSections =
          readDeletedDocumentSections();

        const remainingDeletedSections =
          deletedSections.filter(
            (
              id
            ) =>
              String(id) !==
              warrantyId
          );

        saveDeletedDocumentSections(
          remainingDeletedSections
        );

        /*
        -----------------------------------------------
        SAVE SMALL METADATA
        -----------------------------------------------
        */

        const metadata = {
          fileName:
            file.name,

          fileType:
            file.type,

          fileSize:
            file.size,

          documentUploadedAt:
            new Date().toISOString(),
        };

        saveDocumentMeta(
          warrantyId,
          metadata
        );

        /*
        -----------------------------------------------
        UPDATE PRODUCT STATE
        -----------------------------------------------
        */

        const updatedProducts =
          products.map(
            (
              product
            ) => {
              if (
                String(
                  product?.id
                ) !==
                warrantyId
              ) {
                return product;
              }

              return {
                ...product,

                fileName:
                  file.name,

                fileType:
                  file.type,

                fileSize:
                  file.size,

                fileData:
                  "",

                documentUrl:
                  "",

                documentUploadedAt:
                  metadata.documentUploadedAt,
              };
            }
          );

        setProducts(
          updatedProducts
        );

        /*
        -----------------------------------------------
        CREATE IMAGE PREVIEW
        -----------------------------------------------
        */

        if (
          file.type.startsWith(
            "image/"
          )
        ) {
          const url =
            URL.createObjectURL(
              file
            );

          setDocumentUrls(
            (
              previous
            ) => {
              const oldUrl =
                previous[
                  warrantyId
                ];

              if (
                oldUrl &&
                oldUrl.startsWith(
                  "blob:"
                )
              ) {
                URL.revokeObjectURL(
                  oldUrl
                );
              }

              return {
                ...previous,

                [warrantyId]:
                  url,
              };
            }
          );
        } else {
          setDocumentUrls(
            (
              previous
            ) => {
              const oldUrl =
                previous[
                  warrantyId
                ];

              if (
                oldUrl &&
                oldUrl.startsWith(
                  "blob:"
                )
              ) {
                URL.revokeObjectURL(
                  oldUrl
                );
              }

              const next = {
                ...previous,
              };

              delete next[
                warrantyId
              ];

              return next;
            }
          );
        }

        /*
        -----------------------------------------------
        UPDATE CONNECTED PAGES
        -----------------------------------------------
        */

        window.dispatchEvent(
          new Event(
            "warrantyVaultUpdated"
          )
        );

        setUploadingProductId(
          null
        );

        closeUpload();

        alert(
          "Document uploaded successfully."
        );
      } catch (error) {
        console.error(
          "Unable to save uploaded document:",
          error
        );

        setUploadingProductId(
          null
        );

        alert(
          "Unable to save the document. Please try again."
        );
      }
    };

  /*
  ==========================================================
  EMPTY VAULT
  ==========================================================
  */

  if (
    !isLoading &&
    products.length ===
      0
  ) {
    return (
      <div className="min-h-screen bg-slate-50 pb-40">

        <div className="mx-auto w-full max-w-6xl px-4 pt-7 sm:px-6 sm:pt-9 md:px-8 lg:px-10 lg:pt-12">

          <div>
            <div className="flex items-center gap-2">

              <Archive
                size={17}
                className="text-violet-600"
              />

              <p className="text-sm font-bold text-violet-600">
                Private Vault
              </p>

            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Your Warranty Vault
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Keep your warranty records and
              original documents together in
              one simple place.
            </p>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[32px] bg-slate-950 p-6 shadow-xl sm:p-9 lg:p-12">

            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

            <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">

              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-600 shadow-xl shadow-violet-500/30">

                <FolderOpen
                  size={38}
                  className="text-white"
                />

                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-violet-600">

                  <Check
                    size={14}
                  />

                </div>

              </div>

              <h2 className="mt-7 text-2xl font-bold text-white sm:text-3xl">
                Your vault is ready
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                Save your first warranty and
                keep its receipt, invoice or
                warranty document connected to it.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/")
                }
                className="mt-7 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-violet-50 active:scale-95"
              >

                <Upload
                  size={18}
                />

                Add Warranty

                <ArrowRight
                  size={17}
                />

              </button>

            </div>

          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <VaultFeature
              icon={
                <ShieldCheck
                  size={20}
                />
              }
              title="Track protection"
              description="See which products are protected and which warranties are ending."
            />

            <VaultFeature
              icon={
                <Download
                  size={20}
                />
              }
              title="Keep original files"
              description="Store receipts, invoices and warranty documents with each product."
            />

            <VaultFeature
              icon={
                <Search
                  size={20}
                />
              }
              title="Find them quickly"
              description="Search your saved products instead of digging through your phone."
            />

          </div>

        </div>

      </div>
    );
  }

  /*
  ==========================================================
  LOADING STATE
  ==========================================================
  */

  if (
    isLoading
  ) {
    return (
      <div className="min-h-screen bg-slate-50 pb-40">

        <div className="mx-auto w-full max-w-6xl px-4 pt-7 sm:px-6 sm:pt-9 md:px-8 lg:px-10 lg:pt-12">

          <div className="flex items-center gap-2">

            <Archive
              size={17}
              className="text-violet-600"
            />

            <p className="text-sm font-bold text-violet-600">
              Private Vault
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your Warranty Vault
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">

            {[1, 2].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >

                  <div className="h-56 animate-pulse bg-slate-200 sm:h-64" />

                  <div className="space-y-4 p-5">

                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />

                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />

                    <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />

                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </div>
    );
  }

  /*
  ==========================================================
  MAIN VAULT
  ==========================================================
  */

  return (
    <div className="min-h-screen bg-slate-50 pb-40">

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 lg:px-10 lg:pt-10">

        {/* HEADER */}

        <header>

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <Archive
                  size={17}
                  className="text-violet-600"
                />

                <p className="text-sm font-bold text-violet-600">
                  Private Vault
                </p>

              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Your Warranty Vault
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Everything you saved, organized
                with the documents that belong to
                each product.
              </p>

            </div>

            <div className="hidden shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">

                <Archive
                  size={19}
                />

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Documents
                </p>

                <p className="text-sm font-bold text-slate-900">
                  {documentCount}
                </p>

              </div>

            </div>

          </div>

        </header>

        {/* SUMMARY */}

        <section className="mt-6">

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            <SummaryCard
              icon={
                <Package
                  size={18}
                />
              }
              label="Products"
              value={
                statistics.total
              }
              tone="violet"
            />

            <SummaryCard
              icon={
                <CircleCheck
                  size={18}
                />
              }
              label="Protected"
              value={
                statistics.active
              }
              tone="green"
            />

            <SummaryCard
              icon={
                <Clock3
                  size={18}
                />
              }
              label="Ending soon"
              value={
                statistics.endingSoon +
                statistics.critical
              }
              tone="amber"
            />

            <SummaryCard
              icon={
                <AlertTriangle
                  size={18}
                />
              }
              label="Expired"
              value={
                statistics.expired
              }
              tone="red"
            />

          </div>

        </section>

        {/* MOBILE DOCUMENT COUNT */}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:hidden">

          <div className="flex items-center gap-2">

            <FileText
              size={17}
              className="text-violet-600"
            />

            <span className="text-sm font-semibold text-slate-700">
              Saved documents
            </span>

          </div>

          <span className="text-sm font-bold text-violet-600">
            {documentCount}
          </span>

        </div>

        {/* CONNECTED BANNER */}

        <section className="mt-5">

          <div className="relative overflow-hidden rounded-[30px] bg-violet-100 p-5 sm:p-7">

            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-300/40 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex min-w-0 items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                  <FolderOpen
                    size={22}
                  />

                </div>

                <div className="min-w-0">

                  <p className="break-words text-sm font-bold text-violet-950">
                    Your documents are connected
                  </p>

                  <p className="mt-1 max-w-xl break-words text-xs leading-5 text-violet-900/70 sm:text-sm">
                    Every uploaded receipt, image or
                    PDF stays attached to the warranty
                    it belongs to.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/")
                }
                className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
              >

                <Upload
                  size={17}
                />

                Add warranty

              </button>

            </div>

          </div>

        </section>

        {/* SEARCH + FILTER */}

        <section className="mt-8">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">

              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  searchQuery
                }
                onChange={(
                  event
                ) =>
                  setSearchQuery(
                    event.target
                      .value
                  )
                }
                placeholder="Search products, brands, documents..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-slate-700 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X
                    size={14}
                  />
                </button>
              )}

            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">

              <FilterButton
                label="All"
                count={
                  statistics.total
                }
                active={
                  activeFilter ===
                  "all"
                }
                onClick={() =>
                  setActiveFilter(
                    "all"
                  )
                }
              />

              <FilterButton
                label="Protected"
                count={
                  statistics.active
                }
                active={
                  activeFilter ===
                  "protected"
                }
                onClick={() =>
                  setActiveFilter(
                    "protected"
                  )
                }
              />

              <FilterButton
                label="Ending soon"
                count={
                  statistics.endingSoon
                }
                active={
                  activeFilter ===
                  "ending"
                }
                onClick={() =>
                  setActiveFilter(
                    "ending"
                  )
                }
              />

              <FilterButton
                label="Critical"
                count={
                  statistics.critical
                }
                active={
                  activeFilter ===
                  "critical"
                }
                onClick={() =>
                  setActiveFilter(
                    "critical"
                  )
                }
              />

              <FilterButton
                label="Expired"
                count={
                  statistics.expired
                }
                active={
                  activeFilter ===
                  "expired"
                }
                onClick={() =>
                  setActiveFilter(
                    "expired"
                  )
                }
              />

            </div>

          </div>

        </section>

        {/* LIBRARY HEADER */}

        <section className="mt-7">

          <div className="flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                Document library
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Your saved files
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredProducts.length}{" "}
                {filteredProducts.length ===
                1
                  ? "warranty"
                  : "warranties"}{" "}
                shown
              </p>

            </div>

            <div className="relative shrink-0">

              <button
                type="button"
                onClick={() =>
                  setShowSortMenu(
                    (
                      value
                    ) =>
                      !value
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
              >

                <SlidersHorizontal
                  size={14}
                />

                <span className="hidden sm:inline">
                  Sort
                </span>

                <ChevronDown
                  size={14}
                />

              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  <SortOption
                    label="Warranty expiry"
                    active={
                      sortBy ===
                      "expiry"
                    }
                    onClick={() => {
                      setSortBy(
                        "expiry"
                      );

                      setShowSortMenu(
                        false
                      );
                    }}
                  />

                  <SortOption
                    label="Name"
                    active={
                      sortBy ===
                      "name"
                    }
                    onClick={() => {
                      setSortBy(
                        "name"
                      );

                      setShowSortMenu(
                        false
                      );
                    }}
                  />

                  <SortOption
                    label="Recently added"
                    active={
                      sortBy ===
                      "recent"
                    }
                    onClick={() => {
                      setSortBy(
                        "recent"
                      );

                      setShowSortMenu(
                        false
                      );
                    }}
                  />

                  <SortOption
                    label="Documents first"
                    active={
                      sortBy ===
                      "documents"
                    }
                    onClick={() => {
                      setSortBy(
                        "documents"
                      );

                      setShowSortMenu(
                        false
                      );
                    }}
                  />

                </div>
              )}

            </div>

          </div>

          {/* NO SEARCH RESULTS */}

          {filteredProducts.length ===
            0 && (
            <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                <Search
                  size={28}
                />

              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Nothing found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                We couldn't find a warranty
                matching your search or
                selected filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery(
                    ""
                  );

                  setActiveFilter(
                    "all"
                  );
                }}
                className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700"
              >
                Clear filters
              </button>

            </div>
          )}

          {/* PRODUCT GRID */}

          {filteredProducts.length >
            0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">

              {filteredProducts.map(
                (
                  product
                ) => {
                  const warranty =
                    getWarrantyInfo(
                      product
                    );

                  const isExpired =
                    warranty.statusType ===
                    "expired";

                  const isCritical =
                    warranty.statusType ===
                    "urgent";

                  const isEnding =
                    warranty.statusType ===
                      "warning" ||
                    isCritical;

                  const isImage =
                    isImageFileValue(
                      product
                    );

                  const isPdf =
                    isPdfFileValue(
                      product
                    );

                  const documentExists =
                    hasDocumentValue(
                      product
                    );

                  const isUploading =
                    uploadingProductId ===
                    String(
                      product.id
                    );

                  const previewUrl =
                    getDocumentUrl(
                      product
                    );

                  return (
                    <article
                      key={
                        product.id
                      }
                      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-xl"
                    >

                      {/* PREVIEW */}

                      <div className="relative h-56 overflow-hidden bg-slate-100 sm:h-64">

                        {documentExists &&
                        isImage &&
                        previewUrl ? (
                          <img
                            src={
                              previewUrl
                            }
                            alt={getProductName(
                              product
                            )}
                            loading="lazy"
                            decoding="async"
                            className="block h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : documentExists &&
                          isPdf ? (
                          <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 via-slate-50 to-white">

                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-red-500 shadow-md">

                              <FileText
                                size={38}
                              />

                            </div>

                            <p className="mt-4 text-sm font-bold text-slate-700">
                              PDF Document
                            </p>

                            <p className="mt-1 max-w-[80%] truncate text-xs text-slate-400">
                              {product.fileName ||
                                "Warranty document"}
                            </p>

                            <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">

                              <Check
                                size={12}
                                className="text-emerald-500"
                              />

                              Original file saved

                            </div>

                          </div>
                        ) : documentExists &&
                          isImage ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-slate-50 to-white">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                              <FileImage
                                size={30}
                              />

                            </div>

                            <p className="mt-4 text-sm font-bold text-slate-800">
                              Image saved
                            </p>

                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                              The image is safely stored and
                              can be viewed later.
                            </p>

                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-slate-50 to-white px-6 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                              <FileText
                                size={30}
                              />

                            </div>

                            <p className="mt-4 text-sm font-bold text-slate-800">
                              Warranty saved
                            </p>

                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                              The original receipt,
                              invoice or warranty
                              document hasn't been
                              uploaded yet.
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                openUploadForProduct(
                                  product
                                )
                              }
                              className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
                            >

                              <Upload
                                size={15}
                              />

                              Upload document

                            </button>

                          </div>
                        )}

                        {/* TYPE BADGE */}

                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur">

                          {isImage ? (
                            <FileImage
                              size={13}
                            />
                          ) : (
                            <FileText
                              size={13}
                            />
                          )}

                          {isImage
                            ? "IMAGE"
                            : isPdf
                            ? "PDF"
                            : "DOCUMENT"}

                        </div>

                        {/* WARRANTY STATUS */}

                        <div
                          className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-bold shadow-sm backdrop-blur ${
                            isExpired
                              ? "bg-red-100/95 text-red-700"
                              : isCritical
                              ? "bg-red-100/95 text-red-700"
                              : isEnding
                              ? "bg-amber-100/95 text-amber-700"
                              : "bg-emerald-100/95 text-emerald-700"
                          }`}
                        >
                          {warranty.status}
                        </div>

                        {/* QUICK ACTIONS */}

                        {documentExists && (
                          <div className="absolute bottom-3 right-3 flex gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                viewDocument(
                                  product
                                )
                              }
                              aria-label="View document"
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:bg-violet-600 hover:text-white active:scale-95"
                            >

                              <Eye
                                size={17}
                              />

                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                downloadFile(
                                  product
                                )
                              }
                              aria-label="Download document"
                              className="flex h-10 items-center gap-2 rounded-xl bg-slate-950/95 px-3 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-violet-600 active:scale-95"
                            >

                              <ArrowDownToLine
                                size={15}
                              />

                              <span className="hidden sm:inline">
                                Download
                              </span>

                            </button>

                          </div>
                        )}

                      </div>

                      {/* INFORMATION */}

                      <div className="p-5">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="truncate text-base font-bold text-slate-900">
                              {getProductName(
                                product
                              )}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {product.brand ||
                                "Brand not detected"}{" "}
                              •{" "}
                              {product.category ||
                                "Other"}
                            </p>

                          </div>

                          <div
                            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              isExpired
                                ? "bg-red-100 text-red-700"
                                : isCritical
                                ? "bg-red-100 text-red-700"
                                : isEnding
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >

                            {isExpired ||
                            isCritical ? (
                              <AlertTriangle
                                size={11}
                              />
                            ) : (
                              <Check
                                size={11}
                              />
                            )}

                            {warranty.status}

                          </div>

                        </div>

                        {/* WARRANTY COUNTDOWN */}

                        <div
                          className={`mt-4 rounded-2xl p-4 ${
                            isExpired
                              ? "bg-red-50"
                              : isCritical
                              ? "bg-red-50"
                              : isEnding
                              ? "bg-amber-50"
                              : "bg-emerald-50"
                          }`}
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div className="flex items-center gap-3">

                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ${
                                  isExpired ||
                                  isCritical
                                    ? "text-red-600"
                                    : isEnding
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >

                                <Clock3
                                  size={18}
                                />

                              </div>

                              <div>

                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Warranty time
                                </p>

                                <p
                                  className={`mt-0.5 text-sm font-bold ${
                                    isExpired ||
                                    isCritical
                                      ? "text-red-700"
                                      : isEnding
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                  }`}
                                >

                                  {typeof warranty.daysLeft ===
                                  "number"
                                    ? warranty.daysLeft <
                                      0
                                      ? "Warranty expired"
                                      : warranty.daysLeft ===
                                        0
                                      ? "Ends today"
                                      : warranty.daysLeft ===
                                        1
                                      ? "1 day remaining"
                                      : `${warranty.daysLeft} days remaining`
                                    : "Warranty period unknown"}

                                </p>

                              </div>

                            </div>

                            <ShieldCheck
                              size={20}
                              className={
                                isExpired ||
                                isCritical
                                  ? "text-red-300"
                                  : isEnding
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                              }
                            />

                          </div>

                        </div>

                        {/* DOCUMENT CARD */}

                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">

                              {isImage ? (
                                <FileImage
                                  size={18}
                                />
                              ) : (
                                <FileText
                                  size={18}
                                />
                              )}

                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="truncate text-xs font-bold text-slate-700">
                                {product.fileName ||
                                  "Original document unavailable"}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {documentExists
                                  ? "Original document saved"
                                  : "Document not uploaded"}
                              </p>

                            </div>

                            {documentExists ? (
                              <div className="flex shrink-0 gap-1.5">

                                {/* VIEW */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    viewDocument(
                                      product
                                    )
                                  }
                                  aria-label="View document"
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-violet-100 hover:text-violet-600 active:scale-95"
                                >

                                  <Eye
                                    size={16}
                                  />

                                </button>

                                {/* DOWNLOAD */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFile(
                                      product
                                    )
                                  }
                                  aria-label="Download document"
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-violet-100 hover:text-violet-600 active:scale-95"
                                >

                                  <ArrowDownToLine
                                    size={16}
                                  />

                                </button>

                                {/* DELETE DOCUMENT SECTION */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteDocument(
                                      product
                                    )
                                  }
                                  aria-label={`Delete complete document section for ${getProductName(
                                    product
                                  )}`}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-600 active:scale-95"
                                >

                                  <Trash2
                                    size={16}
                                  />

                                </button>

                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openUploadForProduct(
                                    product
                                  )
                                }
                                aria-label="Upload document"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
                              >

                                <Upload
                                  size={16}
                                />

                              </button>
                            )}

                          </div>

                        </div>

                        {/* WARRANTY DATES */}

                        <div className="mt-4 grid grid-cols-2 gap-2">

                          <div className="rounded-2xl border border-slate-100 bg-white p-3">

                            <div className="flex items-center gap-1.5">

                              <CalendarDays
                                size={13}
                                className="text-slate-400"
                              />

                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Warranty ends
                              </p>

                            </div>

                            <p className="mt-1 text-xs font-bold text-slate-700">
                              {formatDate(
                                product.warrantyEndDate
                              )}
                            </p>

                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white p-3">

                            <div className="flex items-center gap-1.5">

                              <FileText
                                size={13}
                                className="text-slate-400"
                              />

                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Document
                              </p>

                            </div>

                            <p className="mt-1 text-xs font-bold text-slate-700">
                              {documentExists
                                ? isImage
                                  ? "Image saved"
                                  : isPdf
                                  ? "PDF saved"
                                  : "File saved"
                                : "Not uploaded"}
                            </p>

                          </div>

                        </div>

                        {/* ACTION BUTTONS */}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                          <button
                            type="button"
                            onClick={() =>
                              openProduct(
                                product
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-[0.99]"
                          >

                            View warranty

                            <ChevronRight
                              size={15}
                            />

                          </button>

                          {documentExists ? (
                            <>

                              <button
                                type="button"
                                onClick={() =>
                                  viewDocument(
                                    product
                                  )
                                }
                                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-[0.99]"
                              >

                                <Eye
                                  size={15}
                                />

                                View

                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openUploadForProduct(
                                    product
                                  )
                                }
                                disabled={
                                  isUploading
                                }
                                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                              >

                                <RefreshCw
                                  size={15}
                                />

                                Replace

                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteDocument(
                                    product
                                  )
                                }
                                className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.99]"
                              >

                                <Trash2
                                  size={15}
                                />

                                Delete

                              </button>

                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openUploadForProduct(
                                  product
                                )
                              }
                              disabled={
                                isUploading
                              }
                              className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >

                              <Upload
                                size={15}
                              />

                              {isUploading
                                ? "Uploading..."
                                : "Upload document"}

                            </button>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* FOOTER */}

        <section className="mt-8 pb-5 text-center">

          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">

            <CheckCircle2
              size={14}
              className="shrink-0 text-emerald-500"
            />

            <p className="break-words text-[10px] font-medium text-slate-500 sm:text-[11px]">
              Your warranty documents are
              stored securely on this device.
            </p>

          </div>

        </section>

      </div>

      {/* ======================================================
          WARRANTY DETAILS MODAL
      ====================================================== */}

      {warrantyDetailsProduct && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeWarrantyDetails();
            }
          }}
        >

          <div
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            {/* DETAILS HEADER */}

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">

                    <ShieldCheck
                      size={20}
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                      Warranty details
                    </p>

                    <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                      {getProductName(
                        warrantyDetailsProduct
                      )}
                    </h2>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closeWarrantyDetails
                }
                aria-label="Close warranty details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95"
              >

                <X
                  size={17}
                />

              </button>

            </div>

            {/* DETAILS BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">

              {(() => {
                const product =
                  warrantyDetailsProduct;

                const warranty =
                  getWarrantyInfo(
                    product
                  );

                const isExpired =
                  warranty.statusType ===
                  "expired";

                const isCritical =
                  warranty.statusType ===
                  "urgent";

                const isEnding =
                  warranty.statusType ===
                    "warning" ||
                  isCritical;

                const documentExists =
                  hasDocumentValue(
                    product
                  );

                const isImage =
                  isImageFileValue(
                    product
                  );

                const isPdf =
                  isPdfFileValue(
                    product
                  );

                const previewUrl =
                  getDocumentUrl(
                    product
                  );

                return (
                  <div>

                    {/* PRODUCT SUMMARY */}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">

                      <div className="relative h-44 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 md:h-full md:min-h-[180px]">

                        {documentExists &&
                        isImage &&
                        previewUrl ? (
                          <img
                            src={
                              previewUrl
                            }
                            alt={getProductName(
                              product
                            )}
                            className="h-full w-full object-contain"
                          />
                        ) : documentExists &&
                          isPdf ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 to-white p-5 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">

                              <FileText
                                size={30}
                              />

                            </div>

                            <p className="mt-3 text-xs font-bold text-slate-700">
                              PDF Document
                            </p>

                            <p className="mt-1 max-w-full truncate text-[10px] text-slate-400">
                              {product.fileName ||
                                "Warranty document"}
                            </p>

                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-slate-50 to-white p-5 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                              <Package
                                size={30}
                              />

                            </div>

                            <p className="mt-3 text-xs font-bold text-slate-700">
                              {getProductName(
                                product
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Product warranty
                            </p>

                          </div>
                        )}

                      </div>

                      <div>

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-2xl font-bold tracking-tight text-slate-900">
                              {getProductName(
                                product
                              )}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {product.brand ||
                                "Brand not detected"}{" "}
                              •{" "}
                              {product.category ||
                                "Other"}
                            </p>

                          </div>

                          <div
                            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                              isExpired ||
                              isCritical
                                ? "bg-red-100 text-red-700"
                                : isEnding
                                ? "bg-amber-100 text-amber-700"
                                : warranty.statusType ===
                                  "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >

                            {isExpired ||
                            isCritical ? (
                              <AlertTriangle
                                size={14}
                              />
                            ) : (
                              <CheckCircle2
                                size={14}
                              />
                            )}

                            {warranty.status}

                          </div>

                        </div>

                        <div
                          className={`mt-5 rounded-2xl p-4 ${
                            isExpired ||
                            isCritical
                              ? "bg-red-50"
                              : isEnding
                              ? "bg-amber-50"
                              : warranty.statusType ===
                                "active"
                              ? "bg-emerald-50"
                              : "bg-slate-50"
                          }`}
                        >

                          <div className="flex items-center justify-between gap-4">

                            <div>

                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Warranty status
                              </p>

                              <p
                                className={`mt-1 text-base font-bold ${
                                  isExpired ||
                                  isCritical
                                    ? "text-red-700"
                                    : isEnding
                                    ? "text-amber-700"
                                    : warranty.statusType ===
                                      "active"
                                    ? "text-emerald-700"
                                    : "text-slate-700"
                                }`}
                              >

                                {typeof warranty.daysLeft ===
                                "number"
                                  ? warranty.daysLeft <
                                    0
                                    ? "Warranty expired"
                                    : warranty.daysLeft ===
                                      0
                                    ? "Ends today"
                                    : warranty.daysLeft ===
                                      1
                                    ? "1 day remaining"
                                    : `${warranty.daysLeft} days remaining`
                                  : "Warranty period unknown"}

                              </p>

                            </div>

                            <Clock3
                              size={22}
                              className={
                                isExpired ||
                                isCritical
                                  ? "text-red-300"
                                  : isEnding
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                              }
                            />

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* WARRANTY INFORMATION */}

                    <div className="mt-6">

                      <div className="mb-3">

                        <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                          Warranty information
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          Protection details
                        </h3>

                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                        <DetailItem
                          label="Product Name"
                          value={
                            getProductName(
                              product
                            )
                          }
                        />

                        <DetailItem
                          label="Brand"
                          value={
                            product.brand
                          }
                        />

                        <DetailItem
                          label="Category"
                          value={
                            product.category
                          }
                        />

                        <DetailItem
                          label="Model"
                          value={
                            product.model ||
                            product.modelNumber
                          }
                        />

                        <DetailItem
                          label="Serial Number"
                          value={
                            product.serialNumber
                          }
                        />

                        <DetailItem
                          label="Purchase Date"
                          value={
                            formatDate(
                              product.purchaseDate
                            )
                          }
                        />

                        <DetailItem
                          label="Purchase Price"
                          value={
                            product.purchasePrice !==
                              undefined &&
                            product.purchasePrice !==
                              null &&
                            product.purchasePrice !==
                              ""
                              ? `₹${Number(
                                  product.purchasePrice
                                ).toLocaleString(
                                  "en-IN"
                                )}`
                              : null
                          }
                        />

                        <DetailItem
                          label="Warranty Start"
                          value={
                            formatDate(
                              product.warrantyStartDate
                            )
                          }
                        />

                        <DetailItem
                          label="Warranty End"
                          value={
                            formatDate(
                              product.warrantyEndDate
                            )
                          }
                        />

                        <DetailItem
                          label="Warranty Duration"
                          value={
                            product.warrantyDuration
                          }
                        />

                        <DetailItem
                          label="Warranty Type"
                          value={
                            product.warrantyType
                          }
                        />

                        <DetailItem
                          label="Invoice Number"
                          value={
                            product.invoiceNumber
                          }
                        />

                        <DetailItem
                          label="Seller / Dealer"
                          value={
                            product.seller ||
                            product.dealer
                          }
                        />

                        <DetailItem
                          label="Contact"
                          value={
                            product.contact
                          }
                        />

                        <DetailItem
                          label="Place of Supply"
                          value={
                            product.placeOfSupply
                          }
                        />

                      </div>

                    </div>

                    {/* DOCUMENT */}

                    <div className="mt-6">

                      <div className="mb-3">

                        <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                          Original document
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          Warranty file
                        </h3>

                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                              {isImage ? (
                                <FileImage
                                  size={21}
                                />
                              ) : (
                                <FileText
                                  size={21}
                                />
                              )}

                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-bold text-slate-800">
                                {product.fileName ||
                                  "No document uploaded"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {documentExists
                                  ? isPdf
                                    ? "PDF document saved"
                                    : isImage
                                    ? "Image document saved"
                                    : "Document saved"
                                  : "No original document uploaded"}
                              </p>

                            </div>

                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">

                            {documentExists && (
                              <button
                                type="button"
                                onClick={() =>
                                  viewDocument(
                                    product
                                  )
                                }
                                className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-600 active:scale-95"
                              >

                                <Eye
                                  size={15}
                                />

                                View

                              </button>
                            )}

                            {documentExists && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFile(
                                    product
                                  )
                                }
                                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-95"
                              >

                                <ArrowDownToLine
                                  size={15}
                                />

                                Download

                              </button>
                            )}

                            {documentExists && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteDocument(
                                    product
                                  )
                                }
                                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 active:scale-95"
                              >

                                <Trash2
                                  size={15}
                                />

                                Delete

                              </button>
                            )}

                            {!documentExists && (
                              <button
                                type="button"
                                onClick={() => {
                                  closeWarrantyDetails();

                                  openUploadForProduct(
                                    product
                                  );
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
                              >

                                <Upload
                                  size={15}
                                />

                                Upload

                              </button>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* CLOSE */}

                    <div className="mt-6 flex justify-end">

                      <button
                        type="button"
                        onClick={
                          closeWarrantyDetails
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-95"
                      >

                        Close

                      </button>

                    </div>

                  </div>
                );
              })()}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          UPLOAD DOCUMENT MODAL
      ====================================================== */}

      {isUploadOpen &&
        selectedProduct && (
          <div
            className="fixed inset-0 z-[400] flex items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeUpload();
              }
            }}
          >

            <div
              className="w-full rounded-t-[30px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[30px] sm:p-7"
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">

                      <Upload
                        size={17}
                      />

                    </div>

                    <p className="text-lg font-bold text-slate-900">

                      {hasDocumentValue(
                        selectedProduct
                      )
                        ? "Replace document"
                        : "Upload document"}

                    </p>

                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">

                    Add the original warranty
                    document for{" "}

                    <span className="font-semibold text-slate-700">
                      {getProductName(
                        selectedProduct
                      )}
                    </span>
                    .

                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    closeUpload
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95"
                >

                  <X
                    size={17}
                  />

                </button>

              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*,application/pdf"
                onChange={
                  handleDocumentUpload
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  uploadingProductId ===
                  String(
                    selectedProduct.id
                  )
                }
                className="mt-6 flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50 px-5 py-10 text-center transition hover:border-violet-400 hover:bg-violet-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">

                  {uploadingProductId ===
                  String(
                    selectedProduct.id
                  ) ? (
                    <RefreshCw
                      size={27}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload
                      size={27}
                    />
                  )}

                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">

                  {uploadingProductId ===
                  String(
                    selectedProduct.id
                  )
                    ? "Uploading document..."
                    : hasDocumentValue(
                        selectedProduct
                      )
                    ? "Choose a new document"
                    : "Upload image or PDF"}

                </p>

                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  JPG, PNG, WEBP or PDF
                  documents are supported.
                </p>

              </button>

              <div className="mt-4 grid grid-cols-2 gap-2">

                <div className="rounded-2xl bg-slate-50 p-3">

                  <div className="flex items-center gap-2">

                    <FileImage
                      size={15}
                      className="text-violet-600"
                    />

                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Images
                    </p>

                  </div>

                  <p className="mt-1 text-xs font-bold text-slate-700">
                    JPG · PNG · WEBP
                  </p>

                </div>

                <div className="rounded-2xl bg-slate-50 p-3">

                  <div className="flex items-center gap-2">

                    <FileText
                      size={15}
                      className="text-violet-600"
                    />

                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Documents
                    </p>

                  </div>

                  <p className="mt-1 text-xs font-bold text-slate-700">
                    PDF files
                  </p>

                </div>

              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3">

                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <p className="text-[11px] leading-5 text-emerald-800">
                  The uploaded file will stay
                  connected to this warranty and
                  can be viewed or downloaded later.
                </p>

              </div>

            </div>

          </div>
        )}

      {/* ======================================================
          DOCUMENT VIEWER
      ====================================================== */}

      {viewingProduct && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDocumentViewer();
            }
          }}
        >

          <div
            className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            {/* VIEWER HEADER */}

            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">

                  {isImageFileValue(
                    viewingProduct
                  ) ? (
                    <FileImage
                      size={18}
                    />
                  ) : (
                    <FileText
                      size={18}
                    />
                  )}

                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-bold text-slate-900">
                    {getProductName(
                      viewingProduct
                    )}
                  </p>

                  <p className="truncate text-[10px] text-slate-400">
                    {viewingProduct.fileName ||
                      "Warranty document"}
                  </p>

                </div>

              </div>

              <div className="flex shrink-0 items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      viewingProduct
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-600 active:scale-95"
                >

                  <ArrowDownToLine
                    size={15}
                  />

                  <span className="hidden sm:inline">
                    Download
                  </span>

                </button>

                <button
                  type="button"
                  onClick={
                    closeDocumentViewer
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95"
                >

                  <X
                    size={17}
                  />

                </button>

              </div>

            </div>

            {/* VIEWER CONTENT */}

            <div className="min-h-0 flex-1 bg-slate-100">

              {isImageFileValue(
                viewingProduct
              ) ? (
                <div className="flex h-full w-full items-center justify-center overflow-auto p-4 sm:p-8">

                  <img
                    src={
                      viewingUrl
                    }
                    alt={getProductName(
                      viewingProduct
                    )}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
                  />

                </div>
              ) : isPdfFileValue(
                  viewingProduct
                ) ? (
                <iframe
                  src={
                    viewingUrl
                  }
                  title={
                    viewingProduct.fileName ||
                    "Warranty PDF"
                  }
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">

                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-violet-600 shadow-sm">

                    <FileText
                      size={34}
                    />

                  </div>

                  <p className="mt-5 text-sm font-bold text-slate-800">
                    Document preview unavailable
                  </p>

                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                    This file is saved, but your
                    browser cannot preview this
                    document type.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        viewingProduct
                      )
                    }
                    className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white"
                  >

                    <Download
                      size={15}
                    />

                    Download document

                  </button>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/*
============================================================
DETAIL ITEM
============================================================
*/

function DetailItem({
  label,
  value,
}) {
  const displayValue =
    value !== undefined &&
    value !== null &&
    String(
      value
    ).trim() !== ""
      ? String(value)
      : "Not available";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-sm font-semibold ${
          displayValue ===
          "Not available"
            ? "text-slate-400"
            : "text-slate-800"
        }`}
      >
        {displayValue}
      </p>

    </div>
  );
}

/*
============================================================
SUMMARY CARD
============================================================
*/

function SummaryCard({
  icon,
  label,
  value,
  tone,
}) {
  const toneClasses = {
    violet:
      "bg-violet-100 text-violet-600",

    green:
      "bg-emerald-100 text-emerald-600",

    amber:
      "bg-amber-100 text-amber-600",

    red:
      "bg-red-100 text-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 text-lg font-bold text-slate-900">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}

/*
============================================================
FILTER BUTTON
============================================================
*/

function FilterButton({
  label,
  count,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"
      }`}
    >

      {label}

      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
          active
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {count}
      </span>

    </button>
  );
}

/*
============================================================
SORT OPTION
============================================================
*/

function SortOption({
  label,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
        active
          ? "bg-violet-50 text-violet-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >

      {label}

      {active && (
        <Check
          size={14}
        />
      )}

    </button>
  );
}

/*
============================================================
VAULT FEATURE
============================================================
*/

function VaultFeature({
  icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        {icon}
      </div>

      <p className="mt-4 text-sm font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}

export default Protection;

