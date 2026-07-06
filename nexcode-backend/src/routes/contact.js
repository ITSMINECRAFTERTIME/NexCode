// src/routes/contact.js
// POST /contact — saves message to DB, sends email notification via Resend

const express = require('express');
const { z } = require('zod');
const { Resend } = require('resend');
const { supabaseAdmin } = require('../lib/supabase');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const TOPIC_LABELS = {
  technical_support: 'Technical Support',
  billing:           'Billing & Plans',
  enterprise:        'Enterprise Inquiry',
  api_integrations:  'API / Integrations',
  bug_report:        'Bug Report',
  security:          'Security Disclosure',
  other:             'Other'
};

const contactSchema = z.object({
  name:    z.string().min(2, 'Name is too short').max(80),
  email:   z.string().email('Invalid email address'),
  topic:   z.enum([
    'technical_support', 'billing', 'enterprise',
    'api_integrations', 'bug_report', 'security', 'other'
  ], { errorMap: () => ({ message: 'Invalid topic' }) }),
  message: z.string().min(10, 'Message is too short').max(4000)
});

// ── POST /contact ───────────────────────────────────────────
router.post('/', async (req, res) => {
  // 1. Validate
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { name, email, topic, message } = result.data;
  const topicLabel = TOPIC_LABELS[topic];

  // 2. Save to database
  const { error: dbError } = await supabaseAdmin
    .from('contact_messages')
    .insert({ name, email, topic, message });

  if (dbError) {
    console.error('[contact] DB insert failed:', dbError.message);
    // Don't fail the request — still try to send the email
  }

  // 3. Send notification email to you
  try {
    await resend.emails.send({
      from: process.env.CONTACT_EMAIL_FROM || 'NexCode <noreply@nexcode.io>',
      to:   process.env.CONTACT_EMAIL_TO,
      subject: `[NexCode Contact] ${topicLabel} from ${name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#050914;color:#eef2fb;border-radius:12px">
          <div style="margin-bottom:24px">
            <div style="background:linear-gradient(135deg,#2f6bff,#1d4ed8);display:inline-block;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;margin-bottom:16px">New contact message</div>
            <h2 style="margin:0 0 4px;font-size:20px;font-weight:800">${name}</h2>
            <p style="margin:0;color:#9fbaff;font-size:14px">${email}</p>
          </div>
          <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(238,242,251,.4)">Topic</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#5b8bff">${topicLabel}</p>
          </div>
          <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(238,242,251,.4)">Message</p>
            <p style="margin:0;font-size:14.5px;line-height:1.7;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <a href="mailto:${email}?subject=Re: ${topicLabel}" style="display:inline-block;padding:11px 24px;background:linear-gradient(135deg,#2f6bff,#1d4ed8);color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600">Reply to ${name}</a>
        </div>
      `
    });
  } catch (emailError) {
    console.error('[contact] Resend failed:', emailError.message);
    // Still return success — message is in the DB
  }

  // 4. Send acknowledgement to the sender
  try {
    await resend.emails.send({
      from: process.env.CONTACT_EMAIL_FROM || 'NexCode <noreply@nexcode.io>',
      to:   email,
      subject: `We got your message, ${name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#050914;color:#eef2fb;border-radius:12px">
          <div style="background:linear-gradient(135deg,#2f6bff,#1d4ed8);display:inline-block;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;margin-bottom:20px">NexCode</div>
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:900">Got it, ${name}.</h2>
          <p style="margin:0 0 10px;font-size:15px;color:rgba(238,242,251,.65);line-height:1.7">Thanks for reaching out. We received your message about <strong style="color:#eef2fb">${topicLabel}</strong> and will get back to you within 24 hours.</p>
          <p style="margin:0 0 24px;font-size:15px;color:rgba(238,242,251,.65);line-height:1.7">For faster help, join our Discord community.</p>
          <a href="https://discord.gg/nexcode" style="display:inline-block;padding:11px 24px;background:linear-gradient(135deg,#2f6bff,#1d4ed8);color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600">Join Discord</a>
          <p style="margin:24px 0 0;font-size:12px;color:rgba(238,242,251,.28)">NexCode · You received this because you submitted a contact form.</p>
        </div>
      `
    });
  } catch (e) {
    // Non-critical — don't log
  }

  return res.json({ message: 'Message received. We\'ll be in touch within 24 hours.' });
});

module.exports = router;
