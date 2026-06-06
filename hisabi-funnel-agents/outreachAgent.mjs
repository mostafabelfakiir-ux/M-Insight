import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Support running from root or from within this folder
const currentDir = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);
const envPath = fs.existsSync(path.join(currentDir, '..', '.env.local'))
  ? path.join(currentDir, '..', '.env.local')
  : path.join(process.cwd(), '.env.local');

dotenv.config({ path: envPath });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'contact@myhisabi.com';

function generateFallbackPitch(lead) {
  const titleLower = lead.title.toLowerCase();
  const snippetLower = lead.snippet.toLowerCase();
  const isDeveloper = titleLower.includes('dev') || snippetLower.includes('developpeur') || snippetLower.includes('developer') || snippetLower.includes('web');

  let subject = "";
  let body = "";

  if (isDeveloper) {
    subject = `سؤال لمطور مستقل: واش كتضيع وقتك فـ Devis والحسابات؟ 💻`;
    body = `سلام ورجمة الله،

بصفتك مطور مستقل (Freelancer) فالمغرب، الوقت ديالك هو راس مالك. كل ساعة كتقضيها فـ Excel كتصاوب Devis، وتتبع شكون صيفط ليك الـ Avance وشكون مازال، هي ساعة ضايعة من الخدمة الحقيقية.

طورنا **Hisabi** (https://myhisabi.com) باش يحل ليك هاد المشكل تماماً:
1. **صاوب Devis و Facture فـ 60 ثانية** وصيفطهم بـ WhatsApp.
2. **تتبع الـ Avances والمتبقي** بلا ما تلف حتى ريال.
3. **اعرف صافي الربح ديالك** الحقيقي بعد ما تحيد مصاريف السيرفرات والاشتراكات.

**العرض ديالنا ليك:**
جرب Hisabi فابور لمدة 3 أيام (بلا كارت بنكية). تقدر تدخل تسجل مباشرة فـ https://myhisabi.com/login أو إلى بغيتي نسهلو عليك، جاوبني على هاد الإيميل بـ "أنا مهتم" وغنصاوب ليك الحساب ديالك ونعاونك فالتفعيل فالحين.

تحياتي،
مصطفى بلفقير
مؤسس Hisabi`;
  } else {
    subject = `تبسيط فواتير وحسابات عملك الحر (توفير 5 ساعات أسبوعياً) 🇲🇦`;
    body = `أهلاً بك،

أغلب المستقلين وأصحاب المشاريع فالمغرب كيضيعو ما بين 15% حتى 20% من وقتهم فالمتابعة الإدارية وتتبع دفعات الكليان (شكون خلص، شكون عطى Avance وشكون باقي يسالنا). هاد تشتت الحسابات كيخليك تخسر فلوس ووقت بلا ما تحس.

لهذا قمنا ببناء **Hisabi** (https://myhisabi.com)؛ الحل المالي المغربي الأسهل لإدارة الدخل والمصاريف والمهام فبلاصة وحدة بلا تعقيد جداول إكسيل.

**العرض ديالنا ليك:**
تفعيل تجريبي مجاني 100% لمدة 3 أيام بدون أي التزام أو بطاقة بنكية. تقدر تسجل الحساب ديالك مباشرة فـ https://myhisabi.com/login وتبدا التجربة، أو رد على هاد الإيميل بـ "نعم" وغنكلفو بإنشاء حسابك وتفعيله ليك فوراً.

تحياتي،
مصطفى بلفقير
مؤسس Hisabi`;
  }

  return { subject, body };
}

async function generateAiPitch(lead) {
  if (!GEMINI_API_KEY) {
    console.log('⚠️ No GEMINI_API_KEY found in environment. Using smart templates.');
    return generateFallbackPitch(lead);
  }

  const prompt = `
  You are an expert sales representative for "Hisabi" (https://myhisabi.com), a simple financial and invoice management SaaS for Moroccan freelancers, agencies, and auto-entrepreneurs.
  You need to draft a personalized cold outreach email to a potential client.
  
  Lead details:
  - Title: ${lead.title}
  - URL: ${lead.url}
  - Snippet: ${lead.snippet}
  
  Write a short, engaging, and professional email.
  - Language: A friendly mix of professional Moroccan Arabic (Darija) or French (whichever feels more natural for a tech/business context in Morocco).
  - Subject Line: Catchy, relating to their business.
  - Body:
    1. Hook them by mentioning their business/work.
    2. Identify their potential pain points (managing invoices, tracking project deposits/avances, calculating net profit, or tracking task deadines).
    3. Introduce "Hisabi" as the ultimate local Moroccan tool (deals in DH, direct WhatsApp follow-up).
    4. Offer a 3-day free trial.
    5. Call to Action: Ask if they want a free trial or if they want to see how it works.
  
  Return the output strictly in JSON format as follows:
  {
    "subject": "Email Subject Line",
    "body": "Email Body content"
  }
  `;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    const data = await res.json();
    const responseText = data.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error('❌ AI Generation failed, falling back to templates:', error.message);
    return generateFallbackPitch(lead);
  }
}

async function sendEmail(to, subject, htmlBody) {
  if (!RESEND_API_KEY) {
    console.log(`[SIMULATION] Email not sent to ${to} (No RESEND_API_KEY). Draft Saved.`);
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
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function runOutreach() {
  const leadsFilePath = path.join(currentDir, 'leads.json');
  const outboxFilePath = path.join(currentDir, 'outbox_simulation.json');

  if (!fs.existsSync(leadsFilePath)) {
    console.log('❌ No leads file found. Please run leadFinder.mjs first.');
    return { success: false, reason: 'No leads file found' };
  }

  const leads = JSON.parse(fs.readFileSync(leadsFilePath, 'utf8'));
  const newLeads = leads.filter(l => l.status === 'new');
  console.log(`Found ${newLeads.length} new leads to process.`);

  let outbox = [];
  if (fs.existsSync(outboxFilePath)) {
    outbox = JSON.parse(fs.readFileSync(outboxFilePath, 'utf8'));
  }

  const results = [];

  for (const lead of newLeads) {
    console.log(`\nProcessing: ${lead.title} (${lead.url})`);
    
    const pitch = await generateAiPitch(lead);
    console.log(`Generated Subject: ${pitch.subject}`);

    const targetEmail = lead.email || `contact@${lead.domain}`;

    const sendResult = await sendEmail(targetEmail, pitch.subject, pitch.body);

    const outboxItem = {
      leadUrl: lead.url,
      targetEmail,
      subject: pitch.subject,
      body: pitch.body,
      sentAt: new Date().toISOString(),
      status: sendResult.success ? 'sent' : 'drafted',
      result: sendResult
    };
    outbox.push(outboxItem);
    results.push(outboxItem);

    lead.status = sendResult.success ? 'sent' : 'drafted';
  }

  fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf8');
  fs.writeFileSync(outboxFilePath, JSON.stringify(outbox, null, 2), 'utf8');
  console.log(`\n🎉 Outreach processing complete. Saved logs to ${outboxFilePath}`);
  return { success: true, processedCount: newLeads.length, results };
}

if (process.argv[1] && process.argv[1].endsWith('outreachAgent.mjs')) {
  runOutreach();
}
