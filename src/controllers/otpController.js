const otpStore = new Map();

/* ================= SEND OTP ================= */
export const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phone, otp);

    // ✅ FOR TESTING (VERY IMPORTANT)
    console.log("📩 OTP SENT:", phone, otp);

    res.json({
      message: "OTP sent successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;

  if (otpStore.get(phone) !== otp) {
    return res.status(400).json({
      message: "Invalid OTP",
    });
  }

  otpStore.delete(phone);

  res.json({ message: "OTP verified" });
};
