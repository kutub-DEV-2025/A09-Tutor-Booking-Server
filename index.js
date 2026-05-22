const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

const authRoutes = require("./routes/auth");
const tutorRoutes = require("./routes/tutors");
const bookingRoutes = require("./routes/bookings");
const verifyToken = require("./middleware/verifyToken");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;

if (!MONGODB_URI || !ACCESS_TOKEN_SECRET) {
  console.error("Missing required environment variables:");
  if (!MONGODB_URI) console.error("  - MONGODB_URI");
  if (!ACCESS_TOKEN_SECRET)
    console.error("  - ACCESS_TOKEN_SECRET or BETTER_AUTH_SECRET");
  console.error(
    "Please add the missing variables to .env or .env.local and restart the server."
  );
  process.exit(1);
}

process.env.ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET;

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

async function run() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully");

    const db = client.db("tutordb");
    const usersCollection = db.collection("users");
    const tutorsCollection = db.collection("tutors");
    const bookingsCollection = db.collection("bookings");

    app.use("/auth", authRoutes(usersCollection));
    app.use(
      "/",
      tutorRoutes(tutorsCollection, verifyToken)
    );
    app.use(
      "/",
      bookingRoutes(bookingsCollection, tutorsCollection, verifyToken)
    );

    app.use((req, res) => {
      res.status(404).send({
        success: false,
        message: "Route not found",
      });
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Tutor Booking Server Running");
});

app.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});