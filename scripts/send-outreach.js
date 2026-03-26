#!/usr/bin/env node
/**
 * TrialGuard Cold Outreach Sender
 * 
 * Usage: node scripts/send-outreach.js
 * 
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Add your RESEND_API_KEY to .env
 * 3. Run this script
 */

require('dotenv').config();
const { sendColdEmail } = require('../lib/email');

// Lead data
const leads = [
  {
    name: 'Ansh',
    product: 'Klariqo',
    email: 'hello@klariqo.com',
    url: 'https://klariqo.com'
  }
];

async function main() {
  console.log('📧 TrialGuard Cold Outreach Sender');
  console.log('================================\n');
  
  if (!process.env.AGENTMAIL_API_KEY && !process.env.RESEND_API_KEY && !process.env.GMAIL_USER) {
    console.log('❌ ERROR: No email service configured');
    console.log('\n📝 Option 1 - Agentmail (recommended):');
    console.log('1. Go to https://agentmail.to/');
    console.log('2. Add to .env: AGENTMAIL_API_KEY=am_us_xxxx');
    console.log('3. Add to .env: AGENTMAIL_INBOX_ID=your@agentmail.to');
    console.log('\n📝 Option 2 - Resend:');
    console.log('1. Sign up at https://resend.com');
    console.log('2. Add to .env: RESEND_API_KEY=re_xxxxx');
    process.exit(1);
  }
  
  if (process.env.AGENTMAIL_API_KEY) {
    console.log(`✅ Agentmail API key loaded\n`);
  } else {
    console.log(`✅ Alternative email service loaded\n`);
  }
  
  for (const lead of leads) {
    console.log(`→ Sending to ${lead.name} (${lead.product})...`);
    try {
      await sendColdEmail(lead.email, lead.name, lead.product, lead.url);
      console.log(`   ✅ Success!\n`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }
  
  console.log('Done!');
}

main();
