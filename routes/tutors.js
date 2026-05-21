const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

module.exports = (tutorsCollection, verifyToken) => {
  router.get("/tutors", async (req, res) => {
    try {
      const {
        search,
        startDate,
        endDate,
        limit = 20,
        page = 1,
      } = req.query;

      const query = {};

      if (search) {
        query.tutorName = {
          $regex: search,
          $options: "i",
        };
      }

      if (startDate || endDate) {
        query.sessionStartDate = {};

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start)) {
            query.sessionStartDate.$gte = start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end)) {
            query.sessionStartDate.$lte = end;
          }
        }

        if (Object.keys(query.sessionStartDate).length === 0) {
          delete query.sessionStartDate;
        }
      }

      const numericLimit = Math.max(parseInt(limit, 10) || 20, 1);
      const numericPage = Math.max(parseInt(page, 10) || 1, 1);

      const cursor = tutorsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit);

      const result = await cursor.toArray();

      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to load tutors",
      });
    }
  });

  router.get("/featured-tutors", async (req, res) => {
    try {
      const result = await tutorsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to load featured tutors",
      });
    }
  });

  router.get("/tutors/:id", async (req, res) => {
    try {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid tutor id",
        });
      }

      const result = await tutorsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!result) {
        return res.status(404).send({
          success: false,
          message: "Tutor not found",
        });
      }

      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to load tutor details",
      });
    }
  });

  router.post("/tutors", verifyToken, async (req, res) => {
    try {
      const tutorData = req.body;

      if (!tutorData.tutorName || !tutorData.subject) {
        return res.status(400).send({
          success: false,
          message: "Tutor name and subject are required",
        });
      }

      const preparedTutor = {
        tutorName: tutorData.tutorName,
        photoURL: tutorData.photoURL || "",
        subject: tutorData.subject,
        availableDays: tutorData.availableDays || "",
        availableTimeSlot: tutorData.availableTimeSlot || "",
        hourlyFee: Number(tutorData.hourlyFee) || 0,
        totalSlot: Number(tutorData.totalSlot) || 0,
        sessionStartDate: tutorData.sessionStartDate
          ? new Date(tutorData.sessionStartDate)
          : null,
        institution: tutorData.institution || "",
        experience: tutorData.experience || "",
        location: tutorData.location || "",
        teachingMode: tutorData.teachingMode || "",
        description: tutorData.description || "",
        createdBy: req.user.email,
        ownerName: req.user.name || "",
        createdAt: new Date(),
      };

      const result = await tutorsCollection.insertOne(preparedTutor);

      res.send({
        success: true,
        message: "Tutor added successfully",
        insertedId: result.insertedId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to create tutor",
      });
    }
  });

  router.get("/my-tutors", verifyToken, async (req, res) => {
    try {
      const result = await tutorsCollection
        .find({ createdBy: req.user.email })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to load your tutors",
      });
    }
  });

  router.patch("/tutors/:id", verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid tutor id",
        });
      }

      const existingTutor = await tutorsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!existingTutor) {
        return res.status(404).send({
          success: false,
          message: "Tutor not found",
        });
      }

      if (existingTutor.createdBy !== req.user.email) {
        return res.status(403).send({
          success: false,
          message: "Forbidden: you can only update your own tutors",
        });
      }

      const preparedUpdates = {
        ...(updates.tutorName && { tutorName: updates.tutorName }),
        ...(updates.photoURL && { photoURL: updates.photoURL }),
        ...(updates.subject && { subject: updates.subject }),
        ...(updates.availableDays && { availableDays: updates.availableDays }),
        ...(updates.availableTimeSlot && {
          availableTimeSlot: updates.availableTimeSlot,
        }),
        ...(updates.hourlyFee !== undefined && {
          hourlyFee: Number(updates.hourlyFee) || 0,
        }),
        ...(updates.totalSlot !== undefined && {
          totalSlot: Number(updates.totalSlot) || 0,
        }),
        ...(updates.sessionStartDate && {
          sessionStartDate: new Date(updates.sessionStartDate),
        }),
        ...(updates.institution && { institution: updates.institution }),
        ...(updates.experience && { experience: updates.experience }),
        ...(updates.location && { location: updates.location }),
        ...(updates.teachingMode && { teachingMode: updates.teachingMode }),
        ...(updates.description && { description: updates.description }),
      };

      await tutorsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: preparedUpdates }
      );

      res.send({
        success: true,
        message: "Tutor updated successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to update tutor",
      });
    }
  });

  router.delete("/tutors/:id", verifyToken, async (req, res) => {
    try {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid tutor id",
        });
      }

      const existingTutor = await tutorsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!existingTutor) {
        return res.status(404).send({
          success: false,
          message: "Tutor not found",
        });
      }

      if (existingTutor.createdBy !== req.user.email) {
        return res.status(403).send({
          success: false,
          message: "Forbidden: you can only delete your own tutors",
        });
      }

      await tutorsCollection.deleteOne({ _id: new ObjectId(id) });

      res.send({
        success: true,
        message: "Tutor deleted successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to delete tutor",
      });
    }
  });

  return router;
};