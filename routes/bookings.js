const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

module.exports = (
  bookingsCollection,
  tutorsCollection,
  verifyToken
) => {
  router.post("/bookings", verifyToken, async (req, res) => {
    try {
      const { tutorId, studentName, phone } = req.body;

      if (!tutorId || !studentName || !phone) {
        return res.status(400).send({
          success: false,
          message: "Tutor ID, student name and phone are required",
        });
      }

      if (!ObjectId.isValid(tutorId)) {
        return res.status(400).send({
          success: false,
          message: "Invalid Tutor ID",
        });
      }

      const tutor = await tutorsCollection.findOne({
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
          message: "This session is fully booked. You can't join at the moment.",
        });
      }

      const sessionDate = tutor.sessionStartDate
        ? new Date(tutor.sessionStartDate)
        : null;

      if (sessionDate && sessionDate > new Date()) {
        return res.status(400).send({
          success: false,
          message: "Booking is not available yet for this tutor",
        });
      }

      const booking = {
        tutorId,
        tutorName: tutor.tutorName,
        studentName,
        studentEmail: req.user.email,
        phone,
        subject: tutor.subject || req.body.subject || "",
        status: "booked",
        createdAt: new Date(),
      };

      const result = await bookingsCollection.insertOne(booking);

      await tutorsCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        { $inc: { totalSlot: -1 } }
      );

      res.send({
        success: true,
        message: "Booking created successfully",
        insertedId: result.insertedId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Server Error",
      });
    }
  });

  router.get("/my-bookings", verifyToken, async (req, res) => {
    try {
      const bookings = await bookingsCollection
        .find({ studentEmail: req.user.email })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to get bookings",
      });
    }
  });

  router.patch("/bookings/:id", verifyToken, async (req, res) => {
    try {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid Booking ID",
        });
      }

      const booking = await bookingsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!booking) {
        return res.status(404).send({
          success: false,
          message: "Booking Not Found",
        });
      }

      if (booking.studentEmail !== req.user.email) {
        return res.status(403).send({
          success: false,
          message: "Forbidden: you can only cancel your own bookings",
        });
      }

      if (booking.status === "cancelled") {
        return res.status(400).send({
          success: false,
          message: "Booking is already cancelled",
        });
      }

      await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        }
      );

      if (ObjectId.isValid(booking.tutorId)) {
        await tutorsCollection.updateOne(
          { _id: new ObjectId(booking.tutorId) },
          {
            $inc: { totalSlot: 1 },
          }
        );
      }

      res.send({
        success: true,
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Cancel failed",
      });
    }
  });

  return router;
};