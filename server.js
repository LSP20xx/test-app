const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const scanRoutes = require("./routes/scanRoutes");
const testRoutes = require("./routes/testRoutes");
const resourceRoutes = require("./routes/resourceRoutes");

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error(
    "Error: config environment variables not set. Please create/edit .env configuration file."
  );
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 6000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

const dbUrl = process.env.DATABASE_URL.replace("[::1]", "localhost");

// Ruta correcta a las credenciales
const credentialsPath = path.resolve(
  __dirname,
  "./credentials/google-document-ai.json"
);

fs.access(credentialsPath, fs.constants.R_OK, (err) => {
  if (err) {
    console.error(
      `Error: Cannot access credentials file at ${credentialsPath}`
    );
    process.exit(1);
  } else {
    console.log(
      `Success: Credentials file is accessible at ${credentialsPath}`
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }
});

// Conectar a MongoDB usando Mongoose
mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: dbUrl }),
  })
);

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${
        sess.views
      }, User ID: ${sess.userId || "(unauthenticated)"}`
    );
  }
  next();
});

// Authentication Routes
app.use(authRoutes);

// User Routes
app.use(userRoutes);

// Test Routes
app.use(testRoutes);

// Resource Routes
app.use(resourceRoutes);

// Scan Routes
app.use(scanRoutes);

// Root path response
app.get("/", (req, res) => {
  res.render("index");
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
