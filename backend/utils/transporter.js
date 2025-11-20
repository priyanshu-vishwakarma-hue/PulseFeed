const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const { MAILERSEND_API_KEY, MAILERSEND_FROM_EMAIL } = require("../config/dotenv.config");

const mailersend = new MailerSend({
  apiKey: MAILERSEND_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendMail = async ({ from, to, subject, text, html }, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const sentFrom = new Sender(MAILERSEND_FROM_EMAIL || from, "PulseFeed");
      const recipients = [new Recipient(to, to)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html)
        .setText(text);

      const response = await mailersend.email.send(emailParams);
      console.log("Email sent successfully:", response);
      return response;
    } catch (error) {
      console.error(`Email sending attempt ${attempt} failed:`, error.code || error.message);
      
      if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') && attempt < retries) {
        const waitTime = attempt * 1000;
        console.log(`Retrying in ${waitTime}ms... (${attempt}/${retries})`);
        await delay(waitTime);
        continue;
      }
      
      console.error("Error sending email:", error.body || error.message || error);
      throw error;
    }
  }
};

module.exports = sendMail;
