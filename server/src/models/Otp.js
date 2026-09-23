import mongoose from "mongoose";
import bcrypt from "bcrypt";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// Hash OTP before saving
otpSchema.pre("save", async function () {
  if (!this.isModified("otp")) return;

  const salt = await bcrypt.genSalt(10);

  this.otp = await bcrypt.hash(this.otp, salt);
});
// Compare OTP
otpSchema.methods.matchOtp = async function (enteredOtp) {
  return await bcrypt.compare(enteredOtp, this.otp);
};

export default mongoose.model("Otp", otpSchema);
