const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

module.exports = (
  bookingsCollection,
  tutorsCollection,
  verifyToken
) => {

  /*
  =========================
      CREATE BOOKING
  =========================
  */
  router.post(
    "/bookings",
    verifyToken,
    async (req, res) => {

      try {

        const {
          tutorId,
          studentEmail,
          tutorName,
          subject,
        } = req.body;

        // validation
        if (!tutorId || !studentEmail) {
          return res.status(400).send({
            success: false,
            message: "Missing Required Data",
          });
        }

        if (!ObjectId.isValid(tutorId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid Tutor ID",
          });
        }

        const tutor =
          await tutorsCollection.findOne({
            _id: new ObjectId(tutorId),
          });

        if (!tutor) {
          return res.status(404).send({
            success: false,
            message: "Tutor Not Found",
          });
        }

        if (tutor.totalSlot <= 0) {
          return res.status(400).send({
            success: false,
            message: "No Slots Available",
          });
        }

        // insert booking
        const result =
          await bookingsCollection.insertOne({
            tutorId,
            studentEmail,
            tutorName,
            subject,
            status: "booked",
            createdAt: new Date(),
          });

        // decrease slot
        await tutorsCollection.updateOne(
          { _id: new ObjectId(tutorId) },
          { $inc: { totalSlot: -1 } }
        );

        res.send({
          success: true,
          message: "Booking Created Successfully",
          insertedId: result.insertedId,
        });

      } catch (error) {

        console.log(error);

        res.status(500).send({
          success: false,
          message: "Server Error",
        });
      }
    }
  );

  /*
  =========================
      GET USER BOOKINGS
  =========================
  */
  router.get(
    "/my-bookings",
    verifyToken,
    async (req, res) => {

      try {

        const email = req.query.email;

        const bookings =
          await bookingsCollection
            .find({ studentEmail: email })
            .toArray();

        res.send(bookings);

      } catch (error) {

        res.status(500).send({
          success: false,
          message: "Failed To Get Bookings",
        });
      }
    }
  );

  /*
  =========================
      CANCEL BOOKING
  =========================
  */
  router.patch(
    "/bookings/:id",
    verifyToken,
    async (req, res) => {

      try {

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid Booking ID",
          });
        }

        const booking =
          await bookingsCollection.findOne({
            _id: new ObjectId(id),
          });

        if (!booking) {
          return res.status(404).send({
            success: false,
            message: "Booking Not Found",
          });
        }

        // update status
        await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "cancelled",
            },
          }
        );

        // return slot
        await tutorsCollection.updateOne(
          { _id: new ObjectId(booking.tutorId) },
          {
            $inc: { totalSlot: 1 },
          }
        );

        res.send({
          success: true,
          message: "Booking Cancelled",
        });

      } catch (error) {

        console.log(error);

        res.status(500).send({
          success: false,
          message: "Cancel Failed",
        });
      }
    }
  );

  return router;
};