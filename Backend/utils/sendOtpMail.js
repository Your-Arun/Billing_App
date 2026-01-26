const { Resend } = require("resend");
const dotenv = require('dotenv');
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpMail = async (to, otp) => {
  try {
    // ⚠️ Note: Agar domain verify nahi hai, toh sirf 'onboarding@resend.dev' hi chalega
    const fromAddress = process.env.MAIL_FROM || "onboarding@resend.dev";
    
    return await resend.emails.send({
      from: `Property Manager <${fromAddress}>`,
      to: [to],
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333399;">Password Reset Request</h2>
          <p>Aapne password reset ke liye request ki hai. Aapka verification code niche diya gaya hai:</p>
          <div style="background: #F0F2FF; padding: 20px; text-align: center;">
            <h1 style="letter-spacing: 5px; color: #333399; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">Yeh OTP 10 minute tak valid rahega.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Resend Mail Error:", error);
    throw error;
  }
};

module.exports = { sendOtpMail }; // ✅ CommonJS export