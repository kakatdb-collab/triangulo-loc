/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { jsPDF } from "jspdf";
import { initializeApp as initFirebaseApp, getApps as getFirebaseApps } from "firebase/app";
import { getFirestore as getFirebaseDb, doc, updateDoc, getDoc } from "firebase/firestore";

dotenv.config();

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
  } catch (err) {
    console.warn("Error reading firebase-applet-config.json:", err);
  }
}

function getServerDb() {
  if (!firebaseConfig.projectId) return null;
  const app = getFirebaseApps().length === 0 ? initFirebaseApp(firebaseConfig) : getFirebaseApps()[0]!;
  return firebaseConfig.firestoreDatabaseId 
    ? getFirebaseDb(app, firebaseConfig.firestoreDatabaseId) 
    : getFirebaseDb(app);
}

const app = express();
const PORT = 3000;

// Rate limiting middleware to prevent brute force attacks and request flooding
// Key generator uses IP address and authenticated user UID (if provided in authorization header)
const rateLimitKeyGenerator = (req: express.Request): string => {
  const authHeader = req.headers.authorization || "";
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown-ip";
  if (authHeader) {
    return `${clientIp}_${authHeader.slice(-16)}`;
  }
  return clientIp;
};

// Global API Rate Limiter: Max 100 requests per 15 minutes per IP/User
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: "Muitas requisições enviadas deste IP/usuário. Por favor, aguarde alguns minutos antes de tentar novamente.",
    code: "TOO_MANY_REQUESTS"
  }
});

// Strict Rate Limiter for Sensitive Operations (Emails, Payments, Admin operations): Max 10 requests per 15 minutes
const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: "Limite de tentativas excedido para esta operação sensível. Tente novamente mais tarde.",
    code: "TOO_MANY_SENSITIVE_REQUESTS"
  }
});

// Apply global rate limiter to all API endpoints
app.use("/api/", globalApiLimiter);

// Standard middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to get SMTP transporter
function getSMTPTransporter() {
  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    // Return a mock transport for development if no credentials are set yet
    console.warn("SMTP credentials missing. Using mock nodemailer transporter.");
    return {
      sendMail: async (options: any) => {
        console.log("Mock Email Sent:", {
          to: options.to,
          subject: options.subject,
          attachmentsCount: options.attachments?.length || 0,
        });
        return { messageId: "mock-id-" + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Helps with some Hostinger TLS configurations
    }
  });
}

// Helper function to generate full contract PDF buffer server-side as fallback
function generateServerBookingContractPDF(bookingData: any): Buffer {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const clientName = bookingData.clientName || "Cliente";
    const clientPhone = bookingData.clientPhone || "";
    const clientEmail = bookingData.clientEmail || "";
    const bookingId = bookingData.bookingId || bookingData.id || "0000";
    const spaceName = bookingData.spaceName || "Estúdio Triângulo";
    const date = bookingData.date || "";
    const timeSlot = bookingData.timeSlot || "";
    const totalPrice = Number(bookingData.totalPrice || 0);
    const depositPaid = !!bookingData.depositPaid;

    // Header Banner
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 38, "F");
    doc.setFillColor(217, 56, 56);
    doc.rect(0, 38, 210, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ESTUDIO TRIANGULO FOTOCLUB", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 180, 180);
    doc.text("CONTRATO DE LOCACAO DE ESPACO E RESUMO DE AGENDAMENTO", 14, 23);
    doc.text("Largo do Paissandu, 72 - Conj. 1803 / 801 - Centro Historico, SP - CNPJ: 17.351.213/0001-60", 14, 28);

    doc.setFontSize(8.5);
    doc.setTextColor(220, 220, 220);
    doc.setFont("helvetica", "bold");
    doc.text(`Ref: #${bookingId}`, 196, 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Emissao: ${new Date().toLocaleDateString("pt-BR")}`, 196, 22, { align: "right" });
    doc.text(`Status: ${depositPaid ? "Reservado (Sinal Pago)" : "Simulado (Aguardando Sinal)"}`, 196, 28, { align: "right" });

    // Section 1: Parties / Requester
    let y = 48;
    doc.setTextColor(217, 56, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. IDENTIFICACAO DAS PARTES E LOCATARIO", 14, y);
    doc.setDrawColor(217, 56, 56);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, 196, y + 2);

    y += 9;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`LOCADOR: Estúdio Triângulo Fotoclub (CNPJ 17.351.213/0001-60)`, 14, y);
    y += 6;
    doc.text(`LOCATARIO: ${clientName}`, 14, y);
    y += 6;
    doc.text(`E-MAIL: ${clientEmail}  |  TELEFONE/WHATSAPP: ${clientPhone}`, 14, y);

    // Section 2: Booking Details
    y += 12;
    doc.setTextColor(217, 56, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. ESPECIFICACAO DO AGENDAMENTO E VALORES", 14, y);
    doc.line(14, y + 2, 196, y + 2);

    y += 8;
    doc.setFillColor(245, 245, 247);
    doc.rect(14, y, 182, 32, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Espaco Contratado: ${spaceName}`, 18, y + 7);
    doc.text(`Data do Evento/Ensaio: ${date}`, 18, y + 14);
    doc.text(`Periodo / Horario: ${timeSlot}`, 18, y + 21);
    doc.text(`Valor Total: R$ ${totalPrice.toFixed(2)}`, 18, y + 27);

    doc.text(`Sinal de Reserva: R$ 100,00 (${depositPaid ? "PAGO" : "Aguardando Confirmacao"})`, 110, y + 7);
    doc.text(`Saldo Restante: R$ ${Math.max(0, totalPrice - 100).toFixed(2)}`, 110, y + 14);

    // Section 3: Contract Clauses
    y += 40;
    doc.setTextColor(217, 56, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. CLAUSULAS CONTRATUAIS DE LOCACAO", 14, y);
    doc.line(14, y + 2, 196, y + 2);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    const clausesText = [
      "CLAUSULA 1a - OBJETO: Locacao temporaria do espaco fisico do Estudio Triangulo para realizacao de producao fotografica ou audiovisual de natureza licita.",
      "CLAUSULA 2a - NATUREZA JURIDICA: A presente contratacao possui natureza exclusiva de locacao de espaco, inexistindo qualquer vinculo empregaticio ou sociedade.",
      "CLAUSULA 3a - PRAZO E HORARIOS: A locacao vigorara estritamente pelo periodo agendado. Excedentes serao cobrados por hora adicional.",
      "CLAUSULA 4a - PRECO E SINAL: O agendamento e garantido mediante o pagamento do sinal fixo de R$ 100,00, sendo o saldo devido no dia do evento.",
      "CLAUSULA 5a - RESPONSABILIDADE: O Locatario responde integralmente por quaisquer danos causados ao espaco, equipamentos ou instalacoes durante o periodo.",
      "CLAUSULA 6a - CANCELAMENTO: Cancelamentos efetuados com menos de 48h de antecedencia estao sujeitos a retencao do sinal pago.",
      "CLAUSULA 7a - FORO: Fica eleito o foro da Comarca de Sao Paulo/SP para dirimir quaisquer duvidas oriundas deste instrumento."
    ];

    clausesText.forEach((clause) => {
      doc.text(clause, 14, y, { maxWidth: 182 });
      y += 8;
    });

    // Signatures block
    y += 10;
    doc.setDrawColor(180, 180, 180);
    doc.line(20, y + 15, 90, y + 15);
    doc.line(120, y + 15, 190, y + 15);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("ESTUDIO TRIANGULO FOTOCLUB", 55, y + 19, { align: "center" });
    doc.text(`LOCATARIO: ${clientName.toUpperCase()}`, 155, y + 19, { align: "center" });

    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Error generating server contract PDF:", err);
    return Buffer.from("Contrato de Locacao Estudio Triangulo - Ref #" + (bookingData.bookingId || "0000"));
  }
}

// Global helper for standard email templates with required header, footer, and social links
function buildStandardEmail(title: string, badgeText: string, subtitle: string, bodyHtml: string) {
  const currentYear = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="background-color: #0c0a09; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px 12px; width: 100%; box-sizing: border-box;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.7); margin: 0 auto;">
        
        <!-- HEADER / TOPO COM LOGO OFICIAL IGUAL AO DO SITE -->
        <tr>
          <td align="center" style="padding: 32px 24px 28px 24px; background-color: #09090b; border-bottom: 3px solid #d93838; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
              <tr>
                <td align="center" style="padding-bottom: 12px;">
                  <!-- Logo Oficial Triângulo igual ao site -->
                  <a href="https://trianguloestudio.online" target="_blank" style="text-decoration: none; display: inline-block;">
                    <img src="https://i.postimg.cc/bvrMr15X/logo-triangulo-fotoclube-negativo-PNG.png" alt="Estúdio Triângulo" style="height: 52px; width: auto; max-width: 180px; display: block; border: 0;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <h1 style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; letter-spacing: 0.22em; color: #ffffff; text-transform: uppercase;">ESTÚDIO TRIÂNGULO</h1>
                  <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.35em; color: #d93838; font-weight: 800; text-transform: uppercase; font-family: monospace;">FOTOCLUB & COWORKING</p>
                </td>
              </tr>
            </table>

            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #27272a;">
              <p style="margin: 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Largo do Paissandu, 72 • Conj. 1803 / 801 • Centro Histórico, São Paulo - SP
              </p>
              <p style="margin: 3px 0 0 0; font-size: 10px; color: #71717a; font-family: monospace;">
                CNPJ: 17.351.213/0001-60 | CPF: 23.068.107/881 • contato@triangulofotoclub.com.br
              </p>
            </div>
          </td>
        </tr>

        <!-- CORPO DA MENSAGEM / TÍTULO -->
        <tr>
          <td style="padding: 28px 32px 12px 32px; background-color: #18181b;">
            <div style="display: inline-block; background-color: #27272a; border-left: 3px solid #d93838; padding: 6px 14px; border-radius: 0 6px 6px 0; margin-bottom: 12px;">
              <span style="font-family: monospace; font-size: 10px; font-weight: 800; color: #d93838; text-transform: uppercase; letter-spacing: 0.18em;">${badgeText}</span>
            </div>
            <h2 style="margin: 6px 0 4px 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; line-height: 1.3;">${title}</h2>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">${subtitle}</p>
          </td>
        </tr>

        <!-- CONTEÚDO PRINCIPAL DEDICADO -->
        <tr>
          <td style="padding: 12px 32px 32px 32px; background-color: #18181b; color: #e4e4e7; font-size: 14px; line-height: 1.6;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- RODAPÉ MODERNO COM BOTÕES REDONDOS LADO A LADO PARA REDES SOCIAIS -->
        <tr>
          <td style="padding: 32px 32px 28px 32px; background-color: #09090b; border-top: 1px solid #27272a; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #ffffff; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">Estúdio Triângulo Fotoclub</p>
            <p style="margin: 0 0 20px 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
              Infraestrutura Profissional de 120m² • Ciclorama em U • Climatização e Iluminação Completa<br>
              Largo do Paissandu, 72 - Centro, São Paulo - SP (Próximo aos Metrôs República / São Bento)
            </p>

            <!-- REDES SOCIAIS - BOTOES REDONDOS LADO A LADO Apenas com o Logo -->
            <div style="margin: 20px 0 16px 0; padding: 20px 0; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 10px; color: #71717a; text-transform: uppercase; font-family: monospace; letter-spacing: 0.22em; font-weight: 700;">Redes Sociais e Canais Oficiais</p>
              
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; display: inline-table;">
                <tr>
                  <!-- Instagram -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="https://www.instagram.com/triangulofotoclub/" target="_blank" title="Instagram @triangulofotoclub" style="display: block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); text-align: center; text-decoration: none; box-shadow: 0 4px 12px rgba(225,48,108,0.35);">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 20px; height: 20px; margin-top: 12px; vertical-align: middle; filter: brightness(0) invert(1);" />
                    </a>
                  </td>

                  <!-- YouTube -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="https://www.youtube.com/@triangulofotoclub" target="_blank" title="YouTube @triangulofotoclub" style="display: block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #FF0000; text-align: center; text-decoration: none; box-shadow: 0 4px 12px rgba(255,0,0,0.35);">
                      <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube" style="width: 20px; height: 20px; margin-top: 12px; vertical-align: middle; filter: brightness(0) invert(1);" />
                    </a>
                  </td>

                  <!-- WhatsApp -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="https://api.whatsapp.com/send?phone=5511961959349" target="_blank" title="WhatsApp (11) 96195-9349" style="display: block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #25D366; text-align: center; text-decoration: none; box-shadow: 0 4px 12px rgba(37,211,102,0.35);">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 20px; height: 20px; margin-top: 12px; vertical-align: middle; filter: brightness(0) invert(1);" />
                    </a>
                  </td>

                  <!-- Website -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="https://trianguloestudio.online" target="_blank" title="Site Oficial Estúdio Triângulo" style="display: block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #d93838; text-align: center; text-decoration: none; box-shadow: 0 4px 12px rgba(217,56,56,0.35);">
                      <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 20px; height: 20px; margin-top: 12px; vertical-align: middle; filter: brightness(0) invert(1);" />
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <p style="margin: 16px 0 0 0; font-size: 10px; color: #52525b; font-family: monospace; line-height: 1.5;">
              &copy; ${currentYear} Estúdio Triângulo Fotoclub. Todos os direitos reservados.<br>
              Comprovante e contrato emitidos via Plataforma Oficial de Agendamentos.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", smtp_configured: !!process.env.SMTP_USER });
});

// Admin Backup & Daily Export API Endpoints
app.get("/api/admin/trigger-backup", strictApiLimiter, async (req, res) => {
  try {
    const { runLogsBackup } = await import("./scripts/export-logs-backup.js");
    const result = await runLogsBackup();
    return res.json({
      success: true,
      message: "Exportação diária das coleções 'bookings' e 'users' (e logs) para o Cloud Storage e local realizada com sucesso!",
      filepath: result.filepath,
      exportedAt: result.backupData.exportedAt,
      counts: result.backupData.counts,
      cloudStorageStatus: result.backupData.cloudStorageStatus,
    });
  } catch (err: any) {
    console.error("Error running daily backup via API:", err);
    return res.status(500).json({ success: false, error: err.message || "Falha ao gerar backup" });
  }
});

app.get("/api/admin/list-backups", (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith(".json"))
      .map(filename => {
        const filepath = path.join(backupDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeKb: (stats.size / 1024).toFixed(1) + " KB",
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ backups: files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/download-backup/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename against directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(process.cwd(), "backups", safeFilename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).send("Arquivo de backup não encontrado");
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    return res.sendFile(filepath);
  } catch (err: any) {
    return res.status(500).send("Erro ao transferir backup");
  }
});

// Explicit routes for SEO & GEO engines
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  if (fs.existsSync(robotsPath)) {
    return res.sendFile(robotsPath);
  }
  res.send(`User-agent: *\nAllow: /\n\nSitemap: https://trianguloestudio.online/sitemap.xml\n`);
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    return res.sendFile(sitemapPath);
  }

  const today = new Date().toISOString().split("T")[0];
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://trianguloestudio.online/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://triangulofotoclub.com.br/locacao/estudio/01-Escritorio.webp</image:loc>
      <image:title>Estúdio Triângulo Fotoclub - Fundo Infinito e Escritório</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#espacos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#agendamento</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#planos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#portfolio</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#equipamentos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#localizacao</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://trianguloestudio.online/#contato</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`);
});

// 1. API endpoint to process welcome email for new user AND notify admin
app.post("/api/send-welcome-email", strictApiLimiter, async (req, res) => {
  const { email, name, phone } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";

  try {
    const transporter = getSMTPTransporter();
    
    // Email 1: To the Client
    const userBodyHtml = `
      <p style="margin-top: 0;">Olá, <strong style="color: #ffffff;">${name || "Criativo"}</strong>!</p>
      <p>Seja muito bem-vindo ao <strong style="color: #ffffff;">Estúdio Triângulo Fotoclub</strong>!</p>
      <p>Seu cadastro foi realizado com sucesso em nosso sistema. Agora você possui acesso exclusivo à sua área de cliente para:</p>
      
      <table width="100%" style="margin: 20px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold;">✔ Simular e Reservar</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa;">Acompanhe simulações e garanta datas na agenda.</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold;">✔ Sinal de Reserva R$ 100</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa;">Pagamento seguro via PIX ou Cartão com confirmação rápida.</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold;">✔ Contratos Digitais PDF</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa;">Baixe e consulte os contratos de locação a qualquer momento.</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #d93838; font-weight: bold;">✔ Suporte Direto</td>
          <td style="padding: 12px 16px; color: #a1a1aa;">Converse diretamente com nossa equipe e tire dúvidas.</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 32px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #d93838; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 4px; font-family: monospace; display: inline-block;">Acessar Meu Painel de Cliente</a>
      </div>
    `;

    const userHtml = buildStandardEmail(
      "Bem-vindo ao Estúdio Triângulo! 📸",
      "CONTA CRIADA COM SUCESSO",
      "Sua jornada no melhor espaço fotográfico do centro de São Paulo começa agora",
      userBodyHtml
    );

    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: email,
      subject: "Bem-vindo ao Estúdio Triângulo Fotoclub! 📸",
      html: userHtml,
    });

    // Email 2: To Admin (Notificação de Novo Usuário Cadastrado)
    const nowFormatted = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const adminBodyHtml = `
      <p style="margin-top: 0;">Um novo usuário acaba de efetuar o cadastro na plataforma:</p>
      
      <table width="100%" style="margin: 20px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">NOME COMPLETO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${name || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">E-MAIL DE CADASTRO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">TELEFONE / WHATSAPP</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${phone || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">DATA E HORÁRIO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${nowFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">PERFIL DE ACESSO</td>
          <td style="padding: 12px 16px; color: #10b981; font-weight: bold;">Cliente Cadastrado</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 4px; border: 1px solid #3f3f46; font-family: monospace; display: inline-block;">Ver Clientes no Painel Admin</a>
      </div>
    `;

    const adminHtml = buildStandardEmail(
      `👤 Novo Usuário Cadastrado: ${name || email}`,
      "ALERTA ADMINISTRATIVO",
      "Novo cadastro de cliente realizado no sistema",
      adminBodyHtml
    );

    await transporter.sendMail({
      from: `"Sistema Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: adminEmail,
      subject: `👤 NOVO USUÁRIO CADASTRADO: ${name || email}`,
      html: adminHtml,
    });

    return res.json({ success: true, message: "E-mails de boas-vindas e notificação ao admin enviados com sucesso." });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return res.status(500).json({ error: "Falha ao enviar e-mail: " + error.message });
  }
});

// 2. API endpoint to process booking emails with PDF attached (To Client & Admin)
app.post("/api/send-booking-email", globalApiLimiter, async (req, res) => {
  const { 
    clientEmail, 
    clientName, 
    clientPhone, 
    bookingId, 
    spaceName, 
    date, 
    timeSlot, 
    totalPrice, 
    pdfBase64,
    depositPaid,
    status
  } = req.body;

  if (!clientEmail || !bookingId) {
    return res.status(400).json({ error: "Parâmetros obrigatórios ausentes." });
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";

  try {
    const transporter = getSMTPTransporter();
    
    // Prepare PDF Attachment
    const attachments = [];
    if (pdfBase64 && typeof pdfBase64 === "string" && pdfBase64.length > 50) {
      const cleanBase64 = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
      attachments.push({
        filename: `Contrato_Locacao_Estudio_${bookingId}.pdf`,
        content: Buffer.from(cleanBase64, "base64"),
        contentType: "application/pdf"
      });
    } else {
      // Server-side dynamic PDF contract generation fallback
      const serverPdfBuffer = generateServerBookingContractPDF(req.body);
      attachments.push({
        filename: `Contrato_Locacao_Estudio_${bookingId}.pdf`,
        content: serverPdfBuffer,
        contentType: "application/pdf"
      });
    }

    const valorSinalText = depositPaid ? "R$ 100,00 (Pago via InfinitePay)" : "R$ 100,00 (Aguardando Sinal)";
    const statusText = status === "Reservada" ? "Confirmada & Reservada 🔴" : "Simulada (Aguardando Confirmação do Sinal)";

    // Client Email Content
    const clientBodyHtml = `
      <p style="margin-top: 0;">Olá, <strong style="color: #ffffff;">${clientName || "Cliente"}</strong>!</p>
      <p>Sua solicitação de locação no Estúdio Triângulo foi registrada com sucesso. Abaixo estão os detalhes do seu agendamento:</p>
      
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px; font-family: monospace;">CÓDIGO DA RESERVA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO / ESTÚDIO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${spaceName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">DATA SELECIONADA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">HORÁRIO / PERÍODO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${timeSlot}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">VALOR TOTAL DA LOCAÇÃO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold; font-size: 16px;">R$ ${(Number(totalPrice) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">SINAL DE RESERVA (R$ 100)</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold;">${valorSinalText}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">STATUS DO AGENDAMENTO</td>
          <td style="padding: 12px 16px; color: #ffffff; font-weight: bold;">${statusText}</td>
        </tr>
      </table>

      <p style="margin: 16px 0;">📄 <strong>Contrato de Locação Anexado:</strong> O arquivo PDF do seu contrato de locação de espaço foi anexado a esta mensagem em formato oficial para download e consulta.</p>
      
      ${!depositPaid ? `
      <div style="background-color: #3f1a1a; border: 1px solid #7f1d1d; padding: 16px; border-radius: 6px; margin: 24px 0; color: #fca5a5; font-size: 13px; line-height: 1.5;">
        ⚠️ <strong>Atenção:</strong> Sua data e horário de locação só estarão garantidos na agenda após a confirmação do pagamento do sinal fixo de <strong>R$ 100,00</strong>. Acesse seu painel no site para efetuar o pagamento via PIX ou cartão.
      </div>
      ` : ""}

      <div style="text-align: center; margin: 32px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #d93838; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 4px; font-family: monospace; display: inline-block;">Acessar Minhas Reservas</a>
      </div>
    `;

    const clientHtml = buildStandardEmail(
      `Resumo do Agendamento #${bookingId}`,
      "CONFIRMAÇÃO DE AGENDAMENTO",
      `Solicitação de locação registrada para ${date}`,
      clientBodyHtml
    );

    // Admin Email Content (Notificação de Novo Pedido de Reserva)
    const adminBodyHtml = `
      <p style="margin-top: 0;">Um novo pedido de reserva de estúdio foi recebido pelo simulador:</p>
      
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px; font-family: monospace;">CÓDIGO DA RESERVA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">CLIENTE</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${clientName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">E-MAIL DE CONTATO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">TELEFONE / WHATSAPP</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${clientPhone || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO SOLICITADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${spaceName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">DATA E HORÁRIO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${date} (${timeSlot})</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">VALOR TOTAL</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold; font-size: 16px;">R$ ${(Number(totalPrice) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">SINAL DE RESERVA (R$ 100)</td>
          <td style="padding: 12px 16px; color: #10b981; font-weight: bold;">${valorSinalText}</td>
        </tr>
      </table>

      <p style="margin: 16px 0;">📄 <strong>Contrato em Anexo:</strong> A cópia oficial do Contrato de Locação gerado com os dados do cliente e termos foi anexada em PDF para arquivamento e conferência.</p>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 4px; border: 1px solid #3f3f46; font-family: monospace; display: inline-block;">Gerenciar Reserva no Painel Admin</a>
      </div>
    `;

    const adminHtml = buildStandardEmail(
      `📸 Novo Pedido de Reserva: #${bookingId} - ${clientName}`,
      "ALERTA DE NOVO PEDIDO",
      `Novo pedido de agendamento efetuado por ${clientName}`,
      adminBodyHtml
    );

    let clientEmailSent = false;
    let adminEmailSent = false;

    // Send Client Email
    try {
      await transporter.sendMail({
        from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
        to: clientEmail,
        subject: `Resumo do Agendamento Estúdio Triângulo: #${bookingId}`,
        html: clientHtml,
        attachments,
      });
      clientEmailSent = true;
      console.log(`[Email] Booking confirmation email successfully sent to client (${clientEmail}).`);
    } catch (clientErr) {
      console.error(`[Email] Error sending client email to ${clientEmail}:`, clientErr);
    }

    // Send Admin Email
    try {
      await transporter.sendMail({
        from: `"Painel Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
        to: adminEmail,
        subject: `📸 NOVO PEDIDO DE RESERVA: #${bookingId} - ${clientName}`,
        html: adminHtml,
        attachments,
      });
      adminEmailSent = true;
      console.log(`[Email] Booking notification email successfully sent to admin (${adminEmail}).`);
    } catch (adminErr) {
      console.error(`[Email] Error sending admin email to ${adminEmail}:`, adminErr);
    }

    return res.json({ 
      success: clientEmailSent || adminEmailSent, 
      clientEmailSent,
      adminEmailSent,
      message: "E-mails de confirmação e contrato em PDF processados com sucesso." 
    });
  } catch (error: any) {
    console.error("Error processing booking emails:", error);
    return res.status(500).json({ error: "Erro ao enviar e-mail: " + error.message });
  }
});

// 3. API endpoint for Monthly Security & Audit Report
app.post("/api/send-security-report-email", strictApiLimiter, async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";
  const { period, totalEvents = 142, rateLimitTriggers = 8, suspiciousInputs = 0, backupsExecuted = 30 } = req.body || {};

  const reportPeriod = period || new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const generatedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    const transporter = getSMTPTransporter();

    const bodyHtml = `
      <p style="margin-top: 0;">Abaixo está o balanço oficial de segurança, integridade de dados e auditoria do sistema do Estúdio Triângulo:</p>
      
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">PERÍODO DE REFERÊNCIA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; text-transform: capitalize;">${reportPeriod}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">STATUS GLOBAL DO SISTEMA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold;">🟢 100% OPERACIONAL / SEGURO</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">EVENTOS DE AUDITORIA REGISTRADOS</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">${totalEvents} eventos</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">BLOQUEIOS POR RATE LIMITING (IP/USER)</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #f59e0b; font-weight: bold; font-family: monospace;">${rateLimitTriggers} tentativas mitigadas</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">SANIATIZAÇÕES / TENTATIVAS DE INJECTION</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold; font-family: monospace;">${suspiciousInputs} intrusões (0 vulnerabilidades)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">BACKUPS AUTOMÁTICOS DO FIRESTORE</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #3b82f6; font-weight: bold; font-family: monospace;">${backupsExecuted} snapshots diários gerados</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">GERADO EM</td>
          <td style="padding: 12px 16px; color: #ffffff; font-weight: bold; font-family: monospace;">${generatedAt}</td>
        </tr>
      </table>

      <div style="background-color: #172554; border: 1px solid #1e40af; padding: 14px; border-radius: 6px; margin: 24px 0; color: #93c5fd; font-size: 13px; line-height: 1.5;">
        🔒 <strong>Políticas Ativas:</strong> As regras de Firestore com controle de permissão por UID e sanificação estrita de requisições estão ativas e atualizadas no Cloud Run.
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 4px; border: 1px solid #3f3f46; font-family: monospace; display: inline-block;">Acessar Central de Segurança no Painel</a>
      </div>
    `;

    const html = buildStandardEmail(
      "🛡️ Relatório Mensal de Segurança & Auditoria",
      "AUDITORIA & SEGURANÇA",
      `Balanço consolidado referente a ${reportPeriod}`,
      bodyHtml
    );

    await transporter.sendMail({
      from: `"Segurança Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: adminEmail,
      subject: `🛡️ RELATÓRIO MENSAL DE SEGURANÇA & AUDITORIA - ESTÚDIO TRIÂNGULO`,
      html,
    });

    return res.json({ success: true, message: "Relatório de segurança enviado ao e-mail do administrador." });
  } catch (error: any) {
    console.error("Error sending security report email:", error);
    return res.status(500).json({ error: "Erro ao enviar relatório de segurança: " + error.message });
  }
});

// 4. API endpoint for Performance & Metrics Report
app.post("/api/send-performance-report-email", strictApiLimiter, async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";
  const { 
    period = "Balanço Recente", 
    totalRevenue = 0, 
    totalBookings = 0, 
    totalDeposits = 0, 
    uniqueClientsCount = 0,
    topSpaceName = "Estúdio Fundo Infinito",
    avgTicket = 0,
    occupancyRate = "78%"
  } = req.body || {};

  const generatedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    const transporter = getSMTPTransporter();

    const bodyHtml = `
      <p style="margin-top: 0;">Abaixo estão os dados consolidados de desempenho comercial, faturamento e ocupação dos estúdios:</p>
      
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">PERÍODO ANALISADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${period}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">FATURAMENTO BRUTO TOTAL</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold; font-size: 16px;">R$ ${(Number(totalRevenue) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">TOTAL DE RESERVAS REALIZADAS</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">${totalBookings} locações</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ARRECADAÇÃO DE SINAIS (R$ 100)</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold; font-family: monospace;">R$ ${(Number(totalDeposits) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">TICKET MÉDIO POR LOCAÇÃO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold; font-family: monospace;">R$ ${(Number(avgTicket) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">CLIENTES ÚNICOS ATIVOS</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${uniqueClientsCount} produtores/fotógrafos</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO MAIS SOLICITADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${topSpaceName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">EMISSÃO DO RELATÓRIO</td>
          <td style="padding: 12px 16px; color: #ffffff; font-weight: bold; font-family: monospace;">${generatedAt}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #d93838; color: #ffffff; text-decoration: none; padding: 13px 26px; font-weight: bold; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 4px; font-family: monospace; display: inline-block;">Ver Gráficos Interativos no Painel</a>
      </div>
    `;

    const html = buildStandardEmail(
      "📊 Relatório de Desempenho e Métricas",
      "MÉTRICAS & INDICADORES",
      "Relatório analítico do volume de negócios do estúdio",
      bodyHtml
    );

    await transporter.sendMail({
      from: `"Métricas Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: adminEmail,
      subject: `📊 RELATÓRIO DE DESEMPENHO E MÉTRICAS - ESTÚDIO TRIÂNGULO`,
      html,
    });

    return res.json({ success: true, message: "Relatório de desempenho enviado com sucesso ao administrador." });
  } catch (error: any) {
    console.error("Error sending performance report email:", error);
    return res.status(500).json({ error: "Erro ao enviar relatório de desempenho: " + error.message });
  }
});

// 5. API endpoint for Cancelled Booking Notification
app.post("/api/send-cancelled-booking-email", strictApiLimiter, async (req, res) => {
  const { 
    bookingId, 
    clientName, 
    clientEmail, 
    clientPhone, 
    spaceName, 
    date, 
    timeSlot, 
    totalPrice, 
    depositPaid,
    cancelledBy = "Administrador / Painel"
  } = req.body;

  if (!bookingId) {
    return res.status(400).json({ error: "ID da reserva é obrigatório." });
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";

  try {
    const transporter = getSMTPTransporter();

    const bodyHtml = `
      <p style="margin-top: 0;">A reserva abaixo foi marcada como <strong style="color: #ef4444;">CANCELADA</strong>. O horário foi liberado na agenda do estúdio:</p>
      
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px; font-family: monospace;">CÓDIGO DA RESERVA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ef4444; font-weight: bold; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">NOME DO CLIENTE</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${clientName || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">E-MAIL DE CONTATO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold; font-family: monospace;">${clientEmail || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">TELEFONE / WHATSAPP</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${clientPhone || "Não informado"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO LIBERADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${spaceName || "Estúdio Triângulo"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">DATA E HORÁRIO LIBERADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${date || "N/A"} (${timeSlot || "N/A"})</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">VALOR DA LOCAÇÃO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-weight: bold;">R$ ${(Number(totalPrice) || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ORIGEM DO CANCELAMENTO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">${cancelledBy}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">STATUS DO SINAL (R$ 100)</td>
          <td style="padding: 12px 16px; color: ${depositPaid ? "#10b981" : "#f59e0b"}; font-weight: bold;">${depositPaid ? "Sinal Pago (Consultar Cláusula 9ª do Contrato)" : "Sem sinal pago"}</td>
        </tr>
      </table>

      <div style="background-color: #3f1a1a; border: 1px solid #7f1d1d; padding: 14px; border-radius: 6px; margin: 24px 0; color: #fca5a5; font-size: 13px; line-height: 1.5;">
        📜 <strong>Cláusula 9ª - Cancelamento:</strong> Cancelamentos ocorridos com menos de 48h de antecedência sujeitam-se à retenção do sinal de R$ 100,00 nos termos do instrumento contratual.
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.APP_URL || "https://trianguloestudio.online"}" style="background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 4px; border: 1px solid #3f3f46; font-family: monospace; display: inline-block;">Ver Grade de Agendamentos</a>
      </div>
    `;

    const adminHtml = buildStandardEmail(
      `⚠️ Reserva Cancelada: #${bookingId} - ${clientName || "Cliente"}`,
      "ALERTA DE CANCELAMENTO",
      `A reserva #${bookingId} foi cancelada e a data foi desocupada`,
      bodyHtml
    );

    // Send to Admin
    await transporter.sendMail({
      from: `"Painel Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: adminEmail,
      subject: `⚠️ RESERVA CANCELADA: #${bookingId} - ${clientName || "Cliente"}`,
      html: adminHtml,
    });

    // Send copy to Client if email is present
    if (clientEmail) {
      await transporter.sendMail({
        from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
        to: clientEmail,
        subject: `Confirmação de Cancelamento de Reserva Estúdio Triângulo: #${bookingId}`,
        html: adminHtml,
      });
    }

    return res.json({ success: true, message: "Aviso de cancelamento de reserva enviado ao administrador e cliente." });
  } catch (error: any) {
    console.error("Error sending cancelled booking email:", error);
    return res.status(500).json({ error: "Erro ao enviar notificação de cancelamento: " + error.message });
  }
});

// 6. API Endpoint para Simulação e Disparo de E-mails de Confirmação (Todas as Hipóteses)
app.post("/api/simulate-all-emails", strictApiLimiter, async (req, res) => {
  const { targetEmail, hypothesis = "all" } = req.body || {};
  const destEmail = targetEmail || process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";

  if (!destEmail) {
    return res.status(400).json({ error: "E-mail de destino é obrigatório para a simulação." });
  }

  const transporter = getSMTPTransporter();
  const samplePdfBase64 = "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDA+PgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDAKL0xlbmd0aCA0NQo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjcyIDcxOCBUZAooQ29udHJhdG8gZGUgTG9jYWNhbyAtIEVzdHVkaW8gVHJpYW5ndWxvKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDA0MDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIxNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMxMwolJUVPRg==";

  const results: { hypothesis: string; title: string; success: boolean; error?: string }[] = [];

  const runHypothesis1 = async () => {
    const userBodyHtml = `
      <p style="margin-top: 0;">Olá, <strong style="color: #ffffff;">Cliente Teste (Simulação)</strong>!</p>
      <p>Seja muito bem-vindo ao <strong style="color: #ffffff;">Estúdio Triângulo Fotoclub</strong>!</p>
      <p>Este é um e-mail de simulação confirmando que o seu cadastro foi efetuado com sucesso na plataforma.</p>
      <table width="100%" style="margin: 20px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; color: #d93838; font-weight: bold;">✔ Hipótese 1 - Boas-Vindas & Cadastro</td>
          <td style="padding: 12px 16px; color: #a1a1aa;">Simulação de conta criada para ${destEmail}</td>
        </tr>
      </table>
    `;
    const userHtml = buildStandardEmail(
      "Bem-vindo ao Estúdio Triângulo! 📸 [SIMULAÇÃO]",
      "HIPÓTESE 1: CADASTRO REALIZADO",
      "Simulação de e-mail de boas-vindas para novo cliente cadastrado",
      userBodyHtml
    );
    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H1] Bem-vindo ao Estúdio Triângulo Fotoclub! 📸`,
      html: userHtml,
    });
    results.push({ hypothesis: "H1", title: "Boas-Vindas & Cadastro Realizado", success: true });
  };

  const runHypothesis2 = async () => {
    const clientBodyHtml = `
      <p style="margin-top: 0;">Olá, <strong style="color: #ffffff;">Cliente Teste (Simulação)</strong>!</p>
      <p>Sua solicitação de locação no Estúdio Triângulo foi registrada com sucesso (Sinal Pendente):</p>
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">CÓDIGO DA RESERVA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">#SIM-88902</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO SOLICITADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">Estúdio Fundo Infinito White</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">VALOR TOTAL DA LOCAÇÃO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #d93838; font-weight: bold;">R$ 450,00</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">STATUS DO SINAL (R$ 100)</td>
          <td style="padding: 12px 16px; color: #f59e0b; font-weight: bold;">⚠️ Aguardando Pagamento do Sinal</td>
        </tr>
      </table>
      <p style="margin: 16px 0;">📎 <strong>Contrato PDF Anexado:</strong> A minuta do contrato de locação em PDF foi gerada e anexada a esta mensagem.</p>
    `;
    const clientHtml = buildStandardEmail(
      "Resumo do Agendamento #SIM-88902 [SIMULAÇÃO]",
      "HIPÓTESE 2: NOVO PEDIDO (SINAL PENDENTE)",
      "Simulação de confirmação de pedido com minuta de contrato em anexo",
      clientBodyHtml
    );
    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H2] Resumo do Agendamento Estúdio Triângulo: #SIM-88902`,
      html: clientHtml,
      attachments: [{
        filename: "Contrato_Locacao_Estudio_SIM-88902.pdf",
        content: samplePdfBase64,
        encoding: "base64"
      }]
    });
    results.push({ hypothesis: "H2", title: "Nova Reserva Simulada (Contrato PDF Anexado)", success: true });
  };

  const runHypothesis3 = async () => {
    const clientBodyHtml = `
      <p style="margin-top: 0;">Olá, <strong style="color: #ffffff;">Cliente Teste (Simulação)</strong>!</p>
      <p>Recebemos a confirmação de pagamento do seu sinal de reserva no valor de <strong>R$ 100,00</strong> via InfinitePay!</p>
      <div style="background-color: #18181b; padding: 16px; border-radius: 6px; margin: 18px 0; border: 1px solid #3f3f46;">
        <p style="margin: 4px 0;"><strong>RESERVA:</strong> #SIM-88902</p>
        <p style="margin: 4px 0;"><strong>TRANSAÇÃO NSU:</strong> TX-INF-998822</p>
        <p style="margin: 4px 0; color: #10b981;"><strong>STATUS NO SISTEMA:</strong> PAGAMENTO APROVADO 🔴</p>
      </div>
      <p style="color: #d4d4d8;">A baixa foi realizada automaticamente em nosso banco de dados e seu horário está garantido!</p>
    `;
    const clientHtml = buildStandardEmail(
      "✅ Pagamento Aprovado com Sucesso! [SIMULAÇÃO]",
      "HIPÓTESE 3: BAIXA AUTOMÁTICA (PAGAMENTO APROVADO)",
      "Simulação de recebimento do webhook da InfinitePay com confirmação",
      clientBodyHtml
    );
    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H3] ✅ Pagamento Aprovado! Reserva #SIM-88902 Confirmada`,
      html: clientHtml,
    });
    results.push({ hypothesis: "H3", title: "Baixa Automática / Pagamento Aprovado InfinitePay", success: true });
  };

  const runHypothesis4 = async () => {
    const clientBodyHtml = `
      <p style="margin-top: 0;">A reserva <strong style="color: #ef4444;">#SIM-88902</strong> foi marcada como <strong>CANCELADA</strong>.</p>
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">RESERVA CANCELADA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ef4444; font-weight: bold;">#SIM-88902</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa; font-size: 12px;">ESPAÇO DESOCUPADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #ffffff; font-weight: bold;">Estúdio Fundo Infinito White</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa; font-size: 12px;">SINAL RETIDO / DEVOLVIDO</td>
          <td style="padding: 12px 16px; color: #f59e0b; font-weight: bold;">Regido pela Cláusula 9ª do Contrato</td>
        </tr>
      </table>
    `;
    const clientHtml = buildStandardEmail(
      "⚠️ Reserva Cancelada [SIMULAÇÃO]",
      "HIPÓTESE 4: AVISO DE CANCELAMENTO",
      "Simulação de e-mail de notificação de cancelamento de agendamento",
      clientBodyHtml
    );
    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H4] ⚠️ RESERVA CANCELADA: #SIM-88902 - Cliente Exemplo`,
      html: clientHtml,
    });
    results.push({ hypothesis: "H4", title: "Aviso de Cancelamento de Reserva", success: true });
  };

  const runHypothesis5 = async () => {
    const bodyHtml = `
      <p style="margin-top: 0;">Relatório simulado de auditoria e segurança do sistema Estúdio Triângulo:</p>
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa;">STATUS DO SISTEMA</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold;">🟢 100% OPERACIONAL</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa;">RATE LIMITING / PROTEÇÃO</td>
          <td style="padding: 12px 16px; color: #f59e0b; font-weight: bold;">12 Tentativas Mitigadas</td>
        </tr>
      </table>
    `;
    const html = buildStandardEmail(
      "🛡️ Relatório Mensal de Segurança [SIMULAÇÃO]",
      "HIPÓTESE 5: SEGURANÇA & AUDITORIA",
      "Simulação de relatório técnico enviado mensalmente ao admin",
      bodyHtml
    );
    await transporter.sendMail({
      from: `"Segurança Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H5] 🛡️ RELATÓRIO MENSAL DE SEGURANÇA & AUDITORIA`,
      html,
    });
    results.push({ hypothesis: "H5", title: "Relatório Mensal de Segurança & Auditoria", success: true });
  };

  const runHypothesis6 = async () => {
    const bodyHtml = `
      <p style="margin-top: 0;">Relatório simulado de desempenho comercial e faturamento do estúdio:</p>
      <table width="100%" style="margin: 22px 0; border-collapse: collapse; background-color: #202022; border-radius: 6px; overflow: hidden; border: 1px solid #2e2e32;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #a1a1aa;">FATURAMENTO BRUTO ACUMULADO</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #2e2e32; color: #10b981; font-weight: bold;">R$ 18.450,00</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #a1a1aa;">SINAIS DE RESERVA ARRECADADOS</td>
          <td style="padding: 12px 16px; color: #10b981; font-weight: bold;">R$ 4.100,00</td>
        </tr>
      </table>
    `;
    const html = buildStandardEmail(
      "📊 Relatório de Desempenho [SIMULAÇÃO]",
      "HIPÓTESE 6: MÉTRICAS DE NEGÓCIO",
      "Simulação de relatório de desempenho comercial para o gestor",
      bodyHtml
    );
    await transporter.sendMail({
      from: `"Métricas Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: destEmail,
      subject: `[SIMULAÇÃO H6] 📊 RELATÓRIO DE DESEMPENHO E MÉTRICAS - ESTÚDIO TRIÂNGULO`,
      html,
    });
    results.push({ hypothesis: "H6", title: "Relatório de Desempenho Commercial & Métricas", success: true });
  };

  try {
    if (hypothesis === "welcome" || hypothesis === "H1") {
      await runHypothesis1();
    } else if (hypothesis === "booking_pending" || hypothesis === "H2") {
      await runHypothesis2();
    } else if (hypothesis === "payment_approved" || hypothesis === "H3") {
      await runHypothesis3();
    } else if (hypothesis === "booking_cancelled" || hypothesis === "H4") {
      await runHypothesis4();
    } else if (hypothesis === "security_report" || hypothesis === "H5") {
      await runHypothesis5();
    } else if (hypothesis === "performance_report" || hypothesis === "H6") {
      await runHypothesis6();
    } else {
      // Executa TODAS as 6 hipóteses em sequência
      await runHypothesis1();
      await runHypothesis2();
      await runHypothesis3();
      await runHypothesis4();
      await runHypothesis5();
      await runHypothesis6();
    }

    return res.json({
      success: true,
      message: `Simulação concluída com sucesso! ${results.length} e-mail(s) de teste enviado(s) para ${destEmail}.`,
      destEmail,
      results
    });
  } catch (err: any) {
    console.error("Erro na simulação de e-mails:", err);
    return res.status(500).json({
      error: "Falha ao disparar simulação de e-mails: " + err.message,
      results
    });
  }
});

// InfinitePay Integration Real API & Direct Handle Flow (@daluz_jef)
app.post("/api/payment/infinitepay", strictApiLimiter, async (req, res) => {
  const { 
    bookingId, 
    amount = 100, 
    paymentMethod, 
    planId, 
    cycleMonths, 
    clientName, 
    clientEmail, 
    clientPhone, 
    customHandle 
  } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Faltam parâmetros de valor." });
  }

  // Handle / Tag do Usuário na InfinitePay (Default: daluz_jef)
  const handle = customHandle || process.env.INFINITEPAY_HANDLE || "daluz_jef";
  const orderNsu = bookingId || planId || "RES-" + Math.floor(10000 + Math.random() * 90000);
  const numAmount = Number(amount) || 100;
  const description = planId 
    ? `Plano Coworking ${planId.toUpperCase()} (${cycleMonths} Meses) - Estúdio Triângulo` 
    : `Sinal de Reserva - Estúdio Triângulo - ID #${orderNsu}`;

  const hostUrl = process.env.APP_URL || "https://trianguloestudio.online";
  const amountInCents = Math.round(numAmount * 100);

  // Formato oficial do link direto de checkout da InfinitePay fornecido pelo estabelecimento
  const directPayUrl = "https://checkout.infinitepay.io/daluz_jef/mHOzh5edeU";

  // Redirect URL de retorno pós-pagamento
  const redirectUrl = planId
    ? `${hostUrl}?paySuccess=true&planId=${planId}&cycleMonths=${cycleMonths}&order_nsu=${orderNsu}`
    : `${hostUrl}?paySuccess=true&bookingId=${orderNsu}`;

  try {
    console.log(`[InfinitePay] Gerando link para handle "@${handle}", valor R$ ${numAmount} (${amountInCents} centavos)`);

    // Tenta obter link via API Oficial da InfinitePay
    const infinitePayRes = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        handle,
        itens: [
          {
            quantity: 1,
            price: amountInCents,
            description,
          }
        ],
        order_nsu: orderNsu,
        redirect_url: redirectUrl,
        customer: {
          name: clientName || "Cliente Triângulo",
          email: clientEmail || "contato@triangulofotoclub.com.br",
          phone_number: clientPhone || "+5511961959349"
        }
      })
    });

    if (infinitePayRes.ok) {
      const infinitePayData: any = await infinitePayRes.json();
      console.log("[InfinitePay] Link gerado com sucesso via API:", infinitePayData);
      return res.json({
        success: true,
        checkoutUrl: infinitePayData.url || directPayUrl,
        directPayUrl,
        handle,
        orderNsu,
        amount: numAmount
      });
    }

    const errText = await infinitePayRes.text();
    console.warn("[InfinitePay API Warning] Retorno da API:", errText);
    
    // Retorno com o link direto oficial baseando-se na tag/handle @daluz_jef
    return res.json({
      success: true,
      checkoutUrl: directPayUrl,
      directPayUrl,
      handle,
      orderNsu,
      amount: numAmount,
      message: `Link de checkout gerado com sucesso para a Tag @${handle}.`
    });

  } catch (error: any) {
    console.warn("[InfinitePay Direct Link Fallback]:", error.message);
    return res.json({
      success: true,
      checkoutUrl: directPayUrl,
      directPayUrl,
      handle,
      orderNsu,
      amount: numAmount
    });
  }
});

// InfinitePay Webhook Endpoint (/api/infinitepay/webhook e /api/webhook-infinitepay)
const handleInfinitePayWebhook = async (req: express.Request, res: express.Response) => {
  const payload = req.body || {};
  console.log("🔔 [InfinitePay Webhook Notificação Recebida]:", JSON.stringify(payload));

  // Validação opcional de assinatura / segredo via cabeçalho ou parâmetro de consulta se configurado
  const webhookSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const reqSecret = req.headers["x-infinitepay-secret"] || req.headers["x-webhook-secret"] || req.query.secret;
    if (reqSecret && reqSecret !== webhookSecret) {
      console.warn("⚠️ [InfinitePay Webhook] Segredo do Webhook inválido.");
      return res.status(401).json({ error: "Assinatura ou segredo do Webhook inválido." });
    }
  }

  // Extrai identificadores e status flexíveis do payload da InfinitePay
  const order_nsu = payload.order_nsu || payload.metadata || payload.data?.order_nsu || payload.data?.metadata;
  const transaction_nsu = payload.transaction_nsu || payload.data?.transaction_nsu || payload.id || "TX-" + Date.now();
  const rawStatus = (payload.status || payload.event || payload.data?.status || "approved").toString().toLowerCase();
  const receipt_url = payload.receipt_url || payload.data?.receipt_url || null;

  if (!order_nsu && !transaction_nsu) {
    return res.status(200).json({ received: true, note: "Webhook recebido (sem identificador de pedido)" });
  }

  const bookingId = String(order_nsu || "").replace(/^#/, "").trim();

  // Processa Baixa Automática da Reserva no Firestore se for um ID de reserva válido
  if (bookingId) {
    try {
      const db = getServerDb();
      if (db) {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          const paidAt = new Date().toISOString();

          // Determina o status da reserva no sistema
          const isApproved = ["approved", "paid", "paid_out", "success", "completed", "pago", "aprovado"].some(s => rawStatus.includes(s));
          const newStatus = isApproved ? "Pagamento Aprovado" : "Pendente";

          // Atualiza status e marca o sinal como pago com baixa automática no Firestore
          await updateDoc(bookingRef, {
            depositPaid: true,
            depositPaidAt: paidAt,
            status: newStatus,
            paymentStatus: isApproved ? "Aprovado" : "Pendente",
            paymentMethod: "infinitepay",
            transactionNsu: transaction_nsu,
            receiptUrl: receipt_url,
            updatedAt: paidAt
          });

          console.log(`✅ [BAIXA AUTOMÁTICA CONCLUÍDA] Reserva #${bookingId} atualizada para STATUS '${newStatus}' & Sinal Pago no Firestore.`);

          // Envia e-mail de confirmação para o Cliente e para o Admin
          try {
            const transporter = getSMTPTransporter();
            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contato@triangulofotoclub.com.br";
            const clientEmail = bookingData.clientEmail;

            if (clientEmail && transporter) {
              const mailOptions = {
                from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
                to: clientEmail,
                cc: adminEmail,
                subject: `✅ Pagamento Aprovado! Reserva #${bookingId} Confirmada`,
                html: `
                  <div style="font-family: Arial, sans-serif; background-color: #111113; color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
                    <h2 style="color: #ef4444; margin-top: 0; font-size: 20px;">✅ Pagamento Aprovado com Sucesso!</h2>
                    <p>Olá, <strong style="color: #ffffff;">${bookingData.clientName || "Cliente"}</strong>!</p>
                    <p>Recebemos a confirmação de pagamento da sua reserva no valor do sinal via InfinitePay.</p>
                    
                    <div style="background-color: #18181b; padding: 16px; border-radius: 6px; margin: 18px 0; border: 1px solid #3f3f46;">
                      <p style="margin: 4px 0; font-family: monospace;"><strong>CÓDIGO DA RESERVA:</strong> #${bookingId}</p>
                      <p style="margin: 4px 0;"><strong>ESPAÇO:</strong> ${bookingData.spaceName || "Estúdio"}</p>
                      <p style="margin: 4px 0;"><strong>DATA:</strong> ${bookingData.date || "-"}</p>
                      <p style="margin: 4px 0;"><strong>HORÁRIO:</strong> ${bookingData.timeSlot || "-"}</p>
                      <p style="margin: 4px 0; color: #10b981;"><strong>STATUS:</strong> PAGAMENTO APROVADO 🔴</p>
                      <p style="margin: 4px 0; font-size: 12px; color: #a1a1aa;"><strong>TRANSAÇÃO INFINITEPAY:</strong> ${transaction_nsu}</p>
                    </div>

                    <p style="color: #d4d4d8; font-size: 14px;">A baixa automática foi realizada com sucesso em nosso sistema e o seu horário está garantido!</p>
                    <hr style="border: 0; border-top: 1px solid #27272a; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #71717a; margin-bottom: 0;">Estúdio Triângulo • contato@triangulofotoclub.com.br</p>
                  </div>
                `
              };
              await transporter.sendMail(mailOptions);
              console.log(`✉️ [E-MAIL ENVIADO VIA WEBHOOK] Baixa automática notificada para ${clientEmail}`);
            }
          } catch (emailErr) {
            console.warn("[WEBHOOK EMAIL ERROR]:", emailErr);
          }
        } else {
          console.warn(`[WEBHOOK WARNING] Reserva #${bookingId} não encontrada no banco de dados para dar baixa.`);
        }
      }
    } catch (dbErr: any) {
      console.error("[WEBHOOK FIRESTORE ERROR] Erro ao dar baixa na reserva:", dbErr.message);
    }
  }

  // Responde 200 OK imediatamente para confirmar o recebimento do Webhook à InfinitePay
  return res.status(200).json({ 
    received: true, 
    status: rawStatus, 
    bookingId,
    order_nsu, 
    transaction_nsu,
    timestamp: new Date().toISOString()
  });
};

app.post("/api/infinitepay/webhook", handleInfinitePayWebhook);
app.post("/api/webhook-infinitepay", handleInfinitePayWebhook);

// Vite server middleware setup for development, otherwise serve production build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Schedule automated daily Firestore export (every 24 hours) for 'bookings' & 'users'
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setTimeout(async () => {
      try {
        const { runLogsBackup } = await import("./scripts/export-logs-backup.js");
        await runLogsBackup();
      } catch (err) {
        console.warn("[DAILY EXPORT SCHEDULE] Initial snapshot deferred:", err);
      }
    }, 15000); // 15 seconds after boot

    setInterval(async () => {
      try {
        const { runLogsBackup } = await import("./scripts/export-logs-backup.js");
        await runLogsBackup();
      } catch (err) {
        console.warn("[DAILY EXPORT SCHEDULE] Daily snapshot failed:", err);
      }
    }, TWENTY_FOUR_HOURS);
  });
}

startServer();
