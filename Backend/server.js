const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./route/authRoutes.js");
const warrantyRoutes = require("./route/warrantyRoutes.js");
const notificationRoutes = require(
  "./route/notificationRoutes.js"
);

const {
  verifyEmailConnection,
} = require("./services/emailService.js");

const startWarrantyReminderScheduler =
  require(
    "./services/warrantyReminderScheduler.js"
  );

const app = express();

/* =========================================================
   BASIC APP SETTINGS
========================================================= */

app.disable("x-powered-by");

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors()
);

/*
  Normal API requests should never need huge
  JSON bodies.

  Warranty document uploads use their own
  multipart middleware, so this limit does not
  affect those uploads.
*/
app.use(
  express.json({
    limit: "1mb",
  })
);

/* =========================================================
   API ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/warranty",
  warrantyRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Warranty Vault backend is running",
    });
  }
);

app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      status: "healthy",
    });
  }
);

/* =========================================================
   PORT
========================================================= */

const PORT =
  process.env.PORT || 5000;

/* =========================================================
   SERVER STARTUP
========================================================= */

let server;

const startServer = async () => {
  try {
    /*
      MongoDB must be connected before
      the API starts accepting requests.
    */
    await connectDB();

    /*
      Keep your existing email verification.
      Login/reminder functionality remains unchanged.
    */
    await verifyEmailConnection();

    /*
      Start HTTP server.
    */
    server = app.listen(
      PORT,
      () => {
        console.log(
          `Server running on port ${PORT}`
        );

        /*
          Keep the existing scheduler.
          We will optimize the scheduler itself
          after reviewing that file.
        */
        startWarrantyReminderScheduler();
      }
    );
  } catch (error) {
    console.error(
      "Server startup error:",
      error
    );

    process.exit(1);
  }
};

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const shutdownServer = async (
  signal
) => {
  console.log(
    `${signal} received. Shutting down safely...`
  );

  if (!server) {
    process.exit(0);
  }

  server.close(
    () => {
      console.log(
        "HTTP server closed."
      );

      process.exit(0);
    }
  );
};

/* =========================================================
   PROCESS SIGNALS
========================================================= */

process.on(
  "SIGINT",
  () => {
    shutdownServer("SIGINT");
  }
);

process.on(
  "SIGTERM",
  () => {
    shutdownServer("SIGTERM");
  }
);

/* =========================================================
   START APPLICATION
========================================================= */

startServer();