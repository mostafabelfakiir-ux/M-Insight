import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Support running from root or from within this folder
const currentDir = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);
const envPath = fs.existsSync(path.join(currentDir, '..', '.env.local'))
  ? path.join(currentDir, '..', '.env.local')
  : path.join(process.cwd(), '.env.local');

dotenv.config({ path: envPath });

const RIB_NUMBER = process.env.CIH_RIB || '011 780 0000000000000000 00';
const ACCOUNT_NAME = process.env.CIH_NAME || 'Mostafa OS (Hisabi)';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'contact@myhisabi.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// IMAP Config for real client reply tracking
const IMAP_HOST = process.env.IMAP_HOST;
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);
const IMAP_USER = process.env.IMAP_USER;
const IMAP_PASSWORD = process.env.IMAP_PASSWORD;

const POSITIVE_KEYWORDS = [
  'خلص', 'مهتم', 'كيفاش', 'virement', 'rib', 'pay', 'interess', 'abonner', 'tarifs',
  'bghit', 'nkhles', 'fin', 'tman', 'prix', 'details', 'compte', 'bank', 'cih'
];

function generatePaymentEmail(leadName) {
  return {
    subject: `تفاصيل الاشتراك وتفعيل حسابك في Hisabi`,
    body: `أهلاً ${leadName}،

سعيد جداً باهتمامك بالاشتراك في Hisabi لتسهيل إدارة أعمالك وحساباتك.

لتفعيل حسابك مباشرة، يمكنك إجراء تحويل بنكي (Virement) بقيمة الاشتراك إلى حسابنا البنكي في CIH Bank:

- **الاسم الكامل:** ${ACCOUNT_NAME}
- **البنك:** CIH Bank
- **رقم الحساب البنكي (RIB):**
  \`${RIB_NUMBER}\`

بعد إجراء التحويل، يرجى الرد على هذا البريد وإرفاق صورة أو لقطة شاشة لوصل التحويل (Reçu de virement)، وسنقوم بتفعيل حسابك فوراً وإرسال بيانات الدخول الخاصة بك.

*(ملاحظة: إذا كنت بحاجة إلى فاتورة رسمية لشركتك، يرجى إرسال اسم الشركة وعنوانها وسنقوم بإعدادها لك).*

إذا كان لديك أي استفسار آخر، فلا تتردد في طرحه.

تحياتي،
فريق Hisabi
https://myhisabi.com`
  };
}

async function sendEmail(to, subject, htmlBody) {
  if (!RESEND_API_KEY) {
    console.log(`[SIMULATION] Payment details email not sent to ${to} (No RESEND_API_KEY).`);
    return { success: false, simulated: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject: subject,
        html: htmlBody.replace(/\n/g, '<br>')
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, id: data.id };
    } else {
      const errText = await response.text();
      throw new Error(errText);
    }
  } catch (error) {
    console.error(`❌ Failed to send payment email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// 1. REAL IMAP RUN
async function runRealImap() {
  console.log(`🔌 Connecting to IMAP server: ${IMAP_HOST}:${IMAP_PORT}...`);
  
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: {
      user: IMAP_USER,
      pass: IMAP_PASSWORD
    },
    logger: false
  });

  const outboxFilePath = path.join(currentDir, 'outbox_simulation.json');
  const paymentFilePath = path.join(currentDir, 'payment_instructions_sent.json');

  if (!fs.existsSync(outboxFilePath)) {
    console.log('⚠️ No outbox history found to match clients.');
    return;
  }

  const outbox = JSON.parse(fs.readFileSync(outboxFilePath, 'utf8'));
  const targetEmails = outbox.map(e => e.targetEmail.toLowerCase());

  let paymentInstructions = [];
  if (fs.existsSync(paymentFilePath)) {
    paymentInstructions = JSON.parse(fs.readFileSync(paymentFilePath, 'utf8'));
  }

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');

    try {
      await client.mailboxOpen('INBOX');
      const uids = await client.search({ unseen: true });
      console.log(`🔍 Found ${uids.length} unseen messages in Inbox.`);

      for (const uid of uids) {
        const message = await client.fetchOne(uid, { source: true });
        if (!message || !message.source) continue;

        const parsed = await simpleParser(message.source);
        
        const fromAddress = parsed.from?.value[0]?.address?.toLowerCase();
        const bodyText = (parsed.text || "").toLowerCase();
        const subjectText = (parsed.subject || "").toLowerCase();

        console.log(`📩 Received unseen email from: ${fromAddress}`);

        const isTargetLead = targetEmails.some(email => fromAddress && (fromAddress.includes(email) || email.includes(fromAddress)));
        
        if (isTargetLead) {
          const isPositive = POSITIVE_KEYWORDS.some(kw => bodyText.includes(kw) || subjectText.includes(kw));

          if (isPositive) {
            console.log(`🎯 Lead replied positively: "${parsed.subject}"`);
            
            const alreadySent = paymentInstructions.some(p => p.leadEmail.toLowerCase() === fromAddress);

            if (!alreadySent) {
              const name = parsed.from.value[0].name || fromAddress.split('@')[0];
              const response = generatePaymentEmail(name);
              
              console.log(`✉️ Sending payment instructions to ${fromAddress}...`);
              const sendResult = await sendEmail(fromAddress, response.subject, response.body);

              paymentInstructions.push({
                leadEmail: fromAddress,
                inboundReply: parsed.text,
                responseSubject: response.subject,
                responseBody: response.body,
                timestamp: new Date().toISOString(),
                status: sendResult.success ? 'sent' : 'simulated',
                result: sendResult
              });

              await client.messageFlagsAdd({ uid }, ['\\Seen']);
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    fs.writeFileSync(paymentFilePath, JSON.stringify(paymentInstructions, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ IMAP Error:', error.message);
  } finally {
    try {
      await client.logout();
    } catch (e) {}
    console.log('🔌 IMAP Process complete.');
  }
}

// 2. SIMULATED RUN (Fallback if no IMAP credentials)
async function runSimulation() {
  console.log('⚠️ IMAP_HOST is not configured in .env.local. Running in SIMULATION mode...');
  
  const outboxFilePath = path.join(currentDir, 'outbox_simulation.json');
  const paymentFilePath = path.join(currentDir, 'payment_instructions_sent.json');

  if (!fs.existsSync(outboxFilePath)) {
    console.log('❌ No outbox simulation logs found. Run outreachAgent.mjs first.');
    return;
  }

  const outbox = JSON.parse(fs.readFileSync(outboxFilePath, 'utf8'));
  const sentEmails = outbox.filter(e => e.status === 'sent' || e.status === 'drafted');
  
  if (sentEmails.length === 0) {
    console.log('No sent emails to monitor.');
    return;
  }

  let paymentInstructions = [];
  if (fs.existsSync(paymentFilePath)) {
    paymentInstructions = JSON.parse(fs.readFileSync(paymentFilePath, 'utf8'));
  }

  const MOCK_REPLIES = [
    "أنا مهتم، كيفاش نقدر نخلص؟",
    "Bonjour, je suis intéressé par votre plateforme. Comment s'abonner ?",
    "سلام، واش كاين شي تجريب مجاني ولا نخلص نيشان؟ صيفط ليا RIB",
    "Fin bghit nkhles?"
  ];

  const luckyLead = sentEmails[Math.floor(Math.random() * sentEmails.length)];
  const mockReplyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];

  console.log(`\n📥 [SIMULATION] NEW REPLY RECEIVED`);
  console.log(`From: ${luckyLead.targetEmail}`);
  console.log(`Content: "${mockReplyText}"`);

  const response = generatePaymentEmail(luckyLead.targetEmail.split('@')[0]);
  const sendResult = await sendEmail(luckyLead.targetEmail, response.subject, response.body);

  paymentInstructions.push({
    leadEmail: luckyLead.targetEmail,
    inboundReply: mockReplyText,
    responseSubject: response.subject,
    responseBody: response.body,
    timestamp: new Date().toISOString(),
    status: sendResult.success ? 'sent' : 'simulated',
    result: sendResult
  });

  fs.writeFileSync(paymentFilePath, JSON.stringify(paymentInstructions, null, 2), 'utf8');
  console.log(`\n🎉 Simulation process complete. Saved payment instructions log to ${paymentFilePath}`);
}

async function main() {
  if (IMAP_HOST && IMAP_USER && IMAP_PASSWORD) {
    await runRealImap();
  } else {
    await runSimulation();
  }
}

main();
