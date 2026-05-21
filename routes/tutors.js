const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

module.exports = (
  tutorsCollection,
  verifyToken
) => {

  router.get("/tutors", async (req, res) => {

    const result =
      await tutorsCollection.find().toArray();

    res.send(result);
  });


  router.get(
    "/featured-tutors",
    async (req, res) => {

      const result =
        await tutorsCollection
          .find()
          .limit(6)
          .toArray();

      res.send(result);
    }
  );


  router.get(
    "/tutors/:id",
    async (req, res) => {

      const id = req.params.id;

      const result =
        await tutorsCollection.findOne({
          _id: new ObjectId(id),
        });

      res.send(result);
    }
  );


  router.post(
    "/tutors",
    verifyToken,
    async (req, res) => {

      const tutorData = req.body;

      const result =
        await tutorsCollection.insertOne(
          tutorData
        );

      res.send(result);
    }
  );

  return router;
};