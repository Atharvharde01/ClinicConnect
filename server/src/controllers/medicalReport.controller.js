import mongoose from "mongoose";

import MedicalReport from "../models/MedicalReport.js";
import Appointment from "../models/Appointment.js";

import { validateMedicalReport } from "../validators/medicalReport.validator.js";

import Patient from "../models/Patient.js";
import { paginateQuery } from "../utils/paginate.js";
import { uploadMedicalReport } from "../services/medicalReportUpload.service.js";

export const createMedicalReport = async (req, res) => {
  try {
    const validation = validateMedicalReport(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const {
      appointment,
      patient: targetPatientId,
      doctor: targetDoctorId,
      reportType,
      title,
      findings,
      remarks,
      status,
    } = req.body;

    let patientId = targetPatientId || null;
    let doctorId = targetDoctorId || null;

    if (appointment) {
      if (!mongoose.Types.ObjectId.isValid(appointment)) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment id.",
        });
      }

      const appointmentExists = await Appointment.findById(appointment);
      if (!appointmentExists) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found.",
        });
      }

      if (appointmentExists.status !== "Completed") {
        return res.status(400).json({
          success: false,
          message: "Medical report can only be created after completed appointment.",
        });
      }

      patientId = appointmentExists.patient;
      doctorId = appointmentExists.doctor;
    } else {
      if (req.user) {
        const patientRecord = await Patient.findOne({ user: req.user._id });
        if (patientRecord) {
          patientId = patientRecord._id;
        }
      }
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient identification is required to create a medical report.",
      });
    }

    const uploadedReport = req.file
      ? await uploadMedicalReport(req.file)
      : null;

    const report = await MedicalReport.create({
      appointment: appointment || null,
      patient: patientId,
      doctor: doctorId && mongoose.Types.ObjectId.isValid(doctorId) ? doctorId : null,
      reportType,
      title,
      findings: findings || "",
      remarks: remarks || "",
      reportFile: uploadedReport?.secure_url || "",
      status: status || "Completed",
    });

    return res.status(201).json({
      success: true,
      message: "Medical report created successfully.",
      report,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllMedicalReports = async (req, res) => {
  try {
    const response = await paginateQuery({
      model: MedicalReport,
      query: MedicalReport.find()
        .populate("appointment")
        .populate("patient")
        .populate("doctor")
        .sort({ createdAt: -1 }),
      pagination: req.query,
      message: "Medical reports retrieved successfully.",
      legacy: { dataKey: "reports", totalKey: "count" },
    });

    return res.status(200).json(response);

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const getMedicalReportById = async (req, res) => {

  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report id.",
      });
    }

    const report = await MedicalReport.findById(req.params.id)
      .populate("appointment")
      .populate("patient")
      .populate("doctor");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Medical report not found.",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


export const getReportsByPatient = async (req, res) => {
  try {
    let targetPatientId = req.params.patientId;

    if (!targetPatientId && req.user) {
      const patientRecord = await Patient.findOne({ user: req.user._id });
      if (patientRecord) {
        targetPatientId = patientRecord._id.toString();
      }
    }

    if (!targetPatientId || !mongoose.Types.ObjectId.isValid(targetPatientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing patient id.",
      });
    }

    const patientExists = await Patient.findById(targetPatientId);

    if (!patientExists) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const filter = { patient: targetPatientId };
    const response = await paginateQuery({
      model: MedicalReport,
      filter,
      query: MedicalReport.find(filter)
        .populate("appointment")
        .populate("patient")
        .populate("doctor")
        .sort({ createdAt: -1 }),
      pagination: req.query,
      message: "Patient medical reports retrieved successfully.",
      legacy: { dataKey: "reports", totalKey: "count" },
    });

    return res.status(200).json(response);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReportByAppointment = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment id.",
      });
    }

    const report = await MedicalReport.findOne({
      appointment: req.params.appointmentId,
    })
      .populate("appointment")
      .populate("patient")
      .populate("doctor");

    if (!report) {
      return res.status(200).json({
        success: true,
        report: null,
        message: "Medical report not found.",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMedicalReport = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report id.",
      });
    }

    const report = await MedicalReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Medical report not found.",
      });
    }

    const {
      reportType,
      title,
      findings,
      remarks,
      status,
    } = req.body;

    if (reportType) report.reportType = reportType;

    if (title) report.title = title;

    if (findings !== undefined) report.findings = findings;

    if (remarks !== undefined) report.remarks = remarks;

    if (status) report.status = status;

    const uploadedReport = req.file
      ? await uploadMedicalReport(req.file)
      : null;

    if (uploadedReport?.secure_url) report.reportFile = uploadedReport.secure_url;

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Medical report updated successfully.",
      report,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const deleteMedicalReport = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report id.",
      });
    }

    const report = await MedicalReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Medical report not found.",
      });
    }

    // Verify ownership: only the patient who owns the report can delete
    if (req.user) {
      const patientRecord = await Patient.findOne({ user: req.user._id });
      if (!patientRecord || report.patient.toString() !== patientRecord._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this report." });
      }
    }
    await MedicalReport.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Medical report deleted successfully.",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
