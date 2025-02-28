import nodemailer from "nodemailer";
import { google } from "googleapis";

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, USER_EMAIL } = process.env;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) throw new Error("Error getting access token");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: USER_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token!,
      },
    });

    const mailOptions = {
      from: `"Your App" <${USER_EMAIL}>`,
      to: email,
      subject: "Your Verification Code",
      html: `<p>Your verification code is: <strong>${token}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
