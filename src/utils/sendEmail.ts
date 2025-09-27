import e from "express";

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // your app password
  },
});

async function sendOTP(email: string, otp: number) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Register OTP",
    text: `Your OTP for register is: ${otp}. It expires in 10 minutes.`,
  };

  await transporter.sendMail(mailOptions);
}

export { sendOTP };
