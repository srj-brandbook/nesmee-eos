const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending_verification", "active", "disabled"],
      default: "pending_verification",
    },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    notifyInApp: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
userSchema.index({ status: 1 });
userSchema.index({ roleIds: 1 });

userSchema.virtual("isLocked").get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
});

module.exports = mongoose.model("User", userSchema);
