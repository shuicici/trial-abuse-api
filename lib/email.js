const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Email utility for TrialGuard cold outreach
// Supports both Resend API and Gmail SMTP

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Venture <onboarding@resend.dev>';
const REPLY_TO = 'venture@trialguard.api';

// Gmail SMTP transporter (if configured)
let gmailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

/**
 * Send cold outreach email via Agentmail.to, Gmail, or Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body HTML
 */
async function sendEmail(to, subject, html) {
  // Option 1: Agentmail.to (Primary)
  if (process.env.AGENTMAIL_API_KEY && process.env.AGENTMAIL_INBOX_ID) {
    try {
      const inboxId = process.env.AGENTMAIL_INBOX_ID;
      const response = await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: Array.isArray(to) ? to : [to],
          subject: subject,
          html: html,
          text: html.replace(/<[^>]*>?/gm, '') // Simple HTML to text fallback
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Agentmail error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Email sent via Agentmail to ${to}:`, result.message_id);
      return result;
    } catch (error) {
      console.error(`❌ Agentmail failed, trying alternatives:`, error.message);
    }
  }

  // Option 2: Gmail SMTP (Alternative)
  if (gmailTransporter) {
    try {
      const result = await gmailTransporter.sendMail({
        from: process.env.GMAIL_FROM || 'Venture <trialguard.api@gmail.com>',
        to: to,
        subject: subject,
        html: html,
        replyTo: REPLY_TO
      });
      console.log(`✅ Email sent via Gmail to ${to}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`❌ Gmail failed, trying Resend:`, error.message);
    }
  }

  // Option 3: Resend (Legacy)
  if (process.env.RESEND_API_KEY) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html,
        reply_to: REPLY_TO
      });
      console.log(`✅ Email sent via Resend to ${to}:`, result.data?.id);
      return result;
    } catch (error) {
      console.error(`❌ Resend failed:`, error.message);
    }
  }

  throw new Error('No email service configured or all services failed. Add AGENTMAIL_API_KEY or GMAIL_USER or RESEND_API_KEY to .env');
}

/**
 * Send cold outreach to a lead
 * @param {string} to - Recipient email
 * @param {string} founderName - Founder's name
 * @param {string} productName - Product name
 * @param {string} productUrl - Product website
 */
async function sendColdEmail(to, founderName, productName, productUrl) {
  const subject = `Quick question about your ${productName} trial`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Hey ${founderName},</p>
      
      <p>I noticed you're building ${productName} - pretty cool stuff.</p>
      
      <p>I'm reaching out because we just launched <strong>TrialGuard</strong> - an API that detects trial account abuse before it costs you money.</p>
      
      <p>Here's the problem we solve:</p>
      <ul>
        <li>Users creating multiple accounts with +suffix emails</li>
        <li>Disposable email domains eating your API costs</li>
        <li>Same person signing up 5+ times to bypass trial limits</li>
      </ul>
      
      <p><strong>The solution:</strong> A simple API call that checks if an email is suspicious:</p>
      <pre style="background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto;">
POST /api/check-trial
{ "email": "user@example.com" }

→ { "allowed": false, "reason": "already_used_trial" }</pre>
      
      <p>We're giving <strong>50 free checks/month</strong> to help you get started.</p>
      
      <p>Would you be interested in trying it out? Happy to hop on a quick call if you want to chat.</p>
      
      <p>Cheers,<br>Venture<br>Founder, TrialGuard</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="font-size: 12px; color: #888;">
        P.S. - No worries if not interested, just wanted to offer a free tool that could help.
      </p>
    </div>
  `;
  
  return sendEmail(to, subject, html);
}

module.exports = { sendEmail, sendColdEmail };
