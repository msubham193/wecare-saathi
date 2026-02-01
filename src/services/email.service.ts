import nodemailer from "nodemailer";

import { logger } from "../config/logger";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendOfficerApprovalEmail(
    to: string,
    name: string,
    officerId: string,
    tempPassword: string,
  ): Promise<boolean> {
    try {
      const subject =
        "OFFICIAL: Officer Account Approved - Credentials Enclosed";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #000;">WE CARE - SAATHI</h2>
            <p style="margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Emergency Response System</p>
          </div>

          <p><strong>To:</strong> ${name}</p>
          <p><strong>Subject:</strong> Account Approval and Access Credentials</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

          <p>Dear Officer,</p>

          <p>This correspondence is to officially inform you that your registration request for the <strong>We Care - Saathi</strong> Emergency Response System has been reviewed and approved by the administration.</p>

          <p>Your access credentials for the Officer Field Application are provided below. Please treat this information as confidential.</p>

          <div style="background-color: #f9f9f9; border: 1px solid #ccc; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Officer ID:</strong> ${officerId}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>

          <p><strong>Action Required:</strong></p>
          <ol>
            <li>Download and install the We Care - Saathi Officer Field App.</li>
            <li>Log in using the credentials provided above.</li>
            <li>You will be required to change your password immediately upon first login.</li>
          </ol>

          <p>For any technical assistance or issues regarding your account, please contact the IT Support Cell immediately.</p>

          <br>
          <p>ntRegards,</p>
          <p><strong>System Administrator</strong><br>
          We Care - Saathi<br>
          Commissionerate Police</p>

          <div style="margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <p>CONFIDENTIALITY NOTICE: The contents of this email message and any attachments are intended solely for the addressee(s) and may contain confidential and/or privileged information and may be legally protected from disclosure.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          '"We Care Admin" <noreply@wecare.police.gov.in>',
        to,
        subject,
        html,
      });

      logger.info(`Approval email sent to officer ${name} (${to})`);
      return true;
    } catch (error) {
      logger.error("Error sending approval email:", error);
      return false;
    }
  }
}
