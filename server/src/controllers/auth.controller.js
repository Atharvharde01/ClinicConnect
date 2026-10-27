import User from "../models/User.js";
import generateToken from "../utils/generateTokens.js";
import Patient from "../models/Patient.js";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";
import { generatePatientId } from "../utils/generatePatientId.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateRegistrationToken = (email) => {
  return jwt.sign(
    {
      email,
      purpose: "patient-registration",
      verified: true,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    },
  );
};

// =========================
// Login
// =========================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email,
      isActive: true,
    }).select("+password");

    if (!user || user.role === "patient") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      isNewPatient: false,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto || "",
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        profilePhoto: req.user.profilePhoto || "",
        role: req.user.role,
        isActive: req.user.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendPatientOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const patient = await Patient.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!patient) {
      const registrationToken = generateRegistrationToken(email.toLowerCase());

      return res.status(200).json({
        success: true,
        isNewPatient: true,
        message: "Email verified. Please complete your profile.",
        registrationToken,
      });
    }

    // Remove previous OTPs
    await Otp.deleteMany({
      email: email.toLowerCase(),
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP (will be hashed automatically by the model)
    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Email Template
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Clinic Connect Login OTP</h2>

        <p>Hello <strong>${patient.fullName}</strong>,</p>

        <p>Your OTP for login is:</p>

        <h1 style="letter-spacing: 6px;">${otp}</h1>

        <p>This OTP is valid for <strong>5 minutes</strong>.</p>

        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendOtpEmail(patient.email, "Clinic Connect - Login OTP", html);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyPatientOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
    });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: "OTP not found.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });

      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    const isValid = await otpRecord.matchOtp(otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const patient = await Patient.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!patient) {
      const registrationToken = generateRegistrationToken(email.toLowerCase());

      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(200).json({
        success: true,
        isNewPatient: true,
        message: "Email verified. Please complete your profile.",
        registrationToken,
      });
    }

    if (!patient.user) {
      return res.status(500).json({
        success: false,
        message: "Patient account is not linked to a user.",
      });
    }

   const token = generateToken(patient.user, "patient");

    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    return res.status(200).json({
      success: true,
      isNewPatient: false,
      message: "Login successful.",
      token,
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const resendPatientOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const patient = await Patient.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!patient) {
      const registrationToken = generateRegistrationToken(email.toLowerCase());

      return res.status(200).json({
        success: true,
        isNewPatient: true,
        message: "Email verified. Please complete your profile.",
        registrationToken,
      });
    }

    const existingOtp = await Otp.findOne({
      email: email.toLowerCase(),
    });

    // 60-second cooldown
    if (existingOtp) {
      const secondsPassed =
        (Date.now() - new Date(existingOtp.createdAt).getTime()) / 1000;

      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(
            60 - secondsPassed,
          )} seconds before requesting another OTP.`,
        });
      }

      await Otp.deleteOne({ _id: existingOtp._id });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Clinic Connect</h2>

        <p>Hello <strong>${patient.fullName}</strong>,</p>

        <p>Your new OTP is:</p>

        <h1 style="letter-spacing:5px;">${otp}</h1>

        <p>Valid for 5 minutes.</p>
      </div>
    `;

    await sendOtpEmail(patient.email, "Clinic Connect - Resend OTP", html);

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const completePatientProfile = async (req, res) => {
  try {
    const email = req.registration.email;
    const {
      fullName,
      phone,
      gender,
      dob,
      address,
      bloodGroup,
      emergencyContact,
      allergies,
      chronicDiseases,
      insurance,
    } = req.body;

    if (!fullName || !phone || !gender || !dob || !address) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    const existingPatient = await Patient.findOne({
      email,
    });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Patient already exists.",
      });
    }

    const session = await mongoose.startSession();

    session.startTransaction();

    try {
      const user = await User.create(
        [
          {
            fullName,
            email,
            phone,
            role: "patient",
          },
        ],
        { session },
      );

      const patientId = await generatePatientId();

      const patient = await Patient.create(
        [
          {
            user: user[0]._id,
            patientId,
            fullName,
            email,
            phone,
            gender,
            dateOfBirth: dob || undefined,
            bloodGroup,
            address,
            emergencyContact: emergencyContact || {},
            allergies: allergies || [],
            chronicDiseases: chronicDiseases || [],
            insurance: insurance || {},
          },
        ],
        { session },
      );

    
      await session.commitTransaction();

      session.endSession();

      // Remove any previous OTPs
await Otp.deleteMany({
  email: email.toLowerCase(),
});

// Generate new OTP
const otp = Math.floor(
  100000 + Math.random() * 900000
).toString();

// Save OTP
await Otp.create({
  email: email.toLowerCase(),
  otp,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
});

// Email Template
const html = `
<div style="font-family: Arial, sans-serif;">
    <h2>Clinic Connect - Verify Your Account</h2>

    <p>Hello <strong>${fullName}</strong>,</p>

    <p>Your verification OTP is:</p>

    <h1 style="letter-spacing:6px;">
        ${otp}
    </h1>

    <p>This OTP is valid for <strong>5 minutes</strong>.</p>

    <p>You must verify this OTP to activate your account.</p>
</div>
`;

await sendOtpEmail(
  email,
  "Clinic Connect - Verify Your Account",
  html
);

     return res.status(201).json({
  success: true,
  requiresOtp: true,
  message:
    "Registration completed successfully. Please verify the OTP sent to your email.",
});
    } catch (error) {
      await session.abortTransaction();

      session.endSession();

      throw error;
    }
  } catch (error) {
    console.error("completePatientProfile error:", error);

    // Sanitize MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const fieldMessages = {
        email: "This email is already registered.",
        phone: "This phone number is already registered.",
      };

      return res.status(409).json({
        success: false,
        message: fieldMessages[field] || "An account with these details already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// =========================
// Staff Forgot Password - Send OTP
// =========================
export const staffForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
      isActive: true,
    });

    if (!user || user.role === "patient") {
      return res.status(404).json({
        success: false,
        message: "No active staff account found with this email address.",
      });
    }

    // Cooldown check (60 seconds)
    const existingOtp = await Otp.findOne({ email: normalizedEmail });
    if (existingOtp) {
      const secondsPassed =
        (Date.now() - new Date(existingOtp.createdAt).getTime()) / 1000;
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(
            60 - secondsPassed
          )} seconds before requesting another OTP.`,
        });
      }
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to DB (hashed automatically by pre-save hook in Otp model)
    await Otp.create({
      email: normalizedEmail,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Email Template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #16a34a; margin-top: 0;">ClinicConnect Password Reset</h2>
        <p>Hello <strong>${user.fullName}</strong>,</p>
        <p>We received a request to reset your password. Use the verification code below to proceed:</p>
        <div style="background-color: #f0fdf4; border: 1px dashed #16a34a; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <h1 style="letter-spacing: 8px; color: #15803d; margin: 0; font-size: 32px;">${otp}</h1>
        </div>
        <p>This OTP is valid for <strong>5 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, please ignore this email or contact your administrator immediately.</p>
      </div>
    `;

    await sendOtpEmail(user.email, "ClinicConnect - Password Reset OTP", html);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email address.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// Staff Verify Forgot Password OTP
// =========================
export const verifyStaffForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await Otp.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: "OTP not found. Please request a new one.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isValid = await otpRecord.matchOtp(otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// Staff Reset Password
// =========================
export const resetStaffPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, new password, and confirm password are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await Otp.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP validation failed or expired. Please start the process again.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isValid = await otpRecord.matchOtp(otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      isActive: true,
    }).select("+password");

    if (!user || user.role === "patient") {
      return res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
    }

    // Set new password (will be hashed automatically by User model pre-save hook)
    user.password = newPassword;
    await user.save();

    // Invalidate OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

