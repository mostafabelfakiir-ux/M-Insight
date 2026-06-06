import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

const MOCK_REPLIES = [
  "أنا مهتم، كيفاش نقدر نخلص؟",
  "Bonjour, je suis intéressé par votre plateforme. Comment s'abonner ?",
  "سلام، واش كاين شي تجريب مجاني ولا نخلص نيشان؟ صيفط ليا RIB",
  "Fin bghit nkhles?"
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
    console.log(`[SIMULATION] Payment details email not sent to ${to} (No RESEND_API_KEY). Draft Saved.`);
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

export async function runInboxManager() {
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

  console.log(`\n📬 Monitoring ${sentEmails.length} sent emails for replies...`);

  // Simulate receiving a reply from a random sent lead
  const luckyLead = sentEmails[Math.floor(Math.random() * sentEmails.length)];
  const mockReplyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];

  console.log(`\n📥 [NEW REPLY RECEIVED]`);
  console.log(`From: ${luckyLead.targetEmail}`);
  console.log(`Subject: Re: ${luckyLead.subject}`);
  console.log(`Content: "${mockReplyText}"`);

  const response = generatePaymentEmail(luckyLead.targetEmail.split('@')[0]);
  console.log(`\n✉️ [DRAFTING AUTOMATIC REPLY WITH CIH RIB]`);
  console.log(`Subject: ${response.subject}`);
  console.log(`RIB: ${RIB_NUMBER}`);
  console.log(`-----------------------------------------------`);
  console.log(response.body);
  console.log(`-----------------------------------------------`);

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
  console.log(`\n🎉 Process complete. Saved payment instructions log to ${paymentFilePath}`);
}

if (process.argv[1] && process.argv[1].endsWith('inboxManager.mjs')) {
  runInboxManager();
}
