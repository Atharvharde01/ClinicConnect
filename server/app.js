import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRoutes from "../server/src/routes/auth.routes.js";
// import testRoutes from "../server/src/routes/test.routes.js";
import appointmentRoutes from "./src/routes/appointment.routes.js";
import userRoutes from "../server/src/routes/user.routes.js";
import departmentRoutes from "./src/routes/department.routes.js";
import doctorRoutes from "./src/routes/doctor.routes.js";
import patientRoutes from "./src/routes/patient.routes.js";
import prescriptionRoutes from "./src/routes/prescription.routes.js";
import medicineRoutes from "./src/routes/medicine.routes.js";
import availabilityRoutes from "./src/routes/availability.routes.js";
import medicalReportRoutes from "./src/routes/medicalReport.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import adminDoctorRoutes from "./src/routes/adminDoctor.routes.js";
import adminReceptionistRoutes from "./src/routes/adminReceptionist.routes.js";
import adminPharmacistRoutes from "./src/routes/adminPharmacist.routes.js";
import path from "path";
import receptionistRoutes from "./src/routes/receptionist.routes.js";
import pharmacyRoutes from "./src/routes/pharmacy.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";
import activityLogRoutes from "./src/routes/activityLog.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import announcementRoutes from "./src/routes/announcement.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import publicRoutes from "./src/routes/public.routes.js";


const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ClinicConnect API Running",
  });
});

// Health check route for monitoring / UptimeRobot
app.get("/health", async (req, res) => {
  try {
    await mongoose.connection.db.command({ ping: 1 });

    res.status(200).json({
      status: "OK",
      service: "ClinicConnect API",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(503).json({
      status: "ERROR",
      service: "ClinicConnect API",
      database: "disconnected",
    });
  }
});

// Routes

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/medical-reports", medicalReportRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/admins/activity-logs", activityLogRoutes);
app.use("/api/admins/doctors", adminDoctorRoutes);
app.use("/api/admins/receptionists", adminReceptionistRoutes);
app.use("/api/admins/pharmacists", adminPharmacistRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/public", publicRoutes);

export default app;
