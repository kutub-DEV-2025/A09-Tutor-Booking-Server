const express = require("express");

const dotenv = require("dotenv");

const cors = require("cors");

const jwt = require("jsonwebtoken");

const cookieParser = require("cookie-parser");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

dotenv.config();

const app = express();

const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = (req, res, next) => {

  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized Access",
    });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    (err, decoded) => {

      if (err) {
        return res.status(401).send({
          success: false,
          message: "Unauthorized Access",
        });
      }

      req.user = decoded;
      next();
    }
  );
};

const tutorRoutes = require("./routes/tutors");
const bookingRoutes = require("./routes/bookings");

async function run() {

  try {

    await client.connect();

    console.log("MongoDB Connected Successfully");

    const db = client.db("tutordb");

    const tutorsCollection = db.collection("tutors");

    const bookingsCollection = db.collection("bookings");

    
    app.post("/jwt", async (req, res) => {

      const user = req.body;

      const token = jwt.sign(
        user,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false, 
        sameSite: "lax",
      });

      res.send({ success: true });
    });

    app.post("/signout", (req, res) => {

      res.clearCookie("token");

      res.send({ success: true });
    });
app.post("/signin", (req, res) => {
    

      res.send({ success: true });
    });


    app.use(
      "/",
      tutorRoutes(tutorsCollection, verifyToken)
    );

    app.use(
      "/",
      bookingRoutes(
        bookingsCollection,
        tutorsCollection,
        verifyToken
      )
    );

  } catch (error) {
    console.log(error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("MediQueue Server Running");
});

app.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});