import { Resend } from "resend";

const dotenv = require('dotenv')
dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpMail = async (to, otp) => {
  return resend.emails.send({
    from: `Property Manager <${process.env.MAIL_FROM}>`,
    to,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: Arial; padding: 20px">
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing:5px">${otp}</h1>
        <p>Valid for 10 minutes</p>
      </div>
    `,
  });
};
