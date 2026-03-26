#!/usr/bin/env node
require('dotenv').config();
const { sendEmail } = require('../lib/email');

async function test() {
  console.log('🧪 Testing Agentmail.to integration...');
  try {
    const result = await sendEmail(
      'jenny@openclaw.ai', // Test recipient
      'Agentmail Test',
      '<p>This is a test email from the <strong>Closer</strong> agent using Agentmail.to!</p>'
    );
    console.log('🎉 Test successful!', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
