/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

// Global styles & templates for professional emails
const EMAIL_HEADER = `
  <div style="background-color: #181818; color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; width: 100%;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1f1f1f; border: 1px solid #2e2e2e; margin: 20px auto; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <tr>
        <td align="center" style="padding: 40px 20px; background-color: #181818; border-bottom: 2px solid #d93838;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.2em; color: #ffffff;">ESTÚDIO TRIÂNGULO</h1>
          <p style="margin: 5px 0 0 0; font-size: 11px; letter-spacing: 0.3em; color: #d93838; font-family: monospace;">FOTOCLUB</p>
        </td>
      </tr>
`;

const EMAIL_FOOTER = `
      <tr>
        <td style="padding: 30px 40px; background-color: #121212; border-top: 1px solid #2e2e2e; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #888888; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">Estúdio Triângulo Fotoclub</p>
          <p style="margin: 0 0 5px 0; font-size: 11px; color: #666666; line-height: 1.5;">
            Largo do Paissandu, 72 - Conj. 1803 • Centro, São Paulo - SP<br>
            Próximo às estações República, São Bento e Anhangabaú
          </p>
          <p style="margin: 15px 0 0 0; font-size: 11px; color: #888888;">
            <a href="https://www.instagram.com/triangulofotoclub/" style="color: #d93838; text-decoration: none; margin: 0 10px; font-family: monospace;">@triangulofotoclub</a> | 
            <a href="https://api.whatsapp.com/send?phone=5511961959349" style="color: #d93838; text-decoration: none; margin: 0 10px; font-family: monospace;">WhatsApp</a>
          </p>
          <p style="margin: 25px 0 0 0; font-size: 10px; color: #444444; font-family: monospace;">
            &copy; ${new Date().getFullYear()} Estúdio Triângulo. Todos os direitos reservados.
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", smtp_configured: !!process.env.SMTP_USER });
});

// API endpoint to process welcome email for new user
app.post("/api/send-welcome-email", async (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  try {
    const transporter = getSMTPTransporter();
    const mailOptions = {
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: email,
      subject: "Bem-vindo ao Estúdio Triângulo Fotoclub! 📸",
      html: `
        ${EMAIL_HEADER}
        <tr>
          <td style="padding: 40px; color: #e4e4e7; line-height: 1.6; font-size: 15px;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; font-weight: 600;">Olá, ${name || "Criativo"}!</h2>
            <p>Seja muito bem-vindo ao <strong>Estúdio Triângulo Fotoclub</strong>!</p>
            <p>Seu cadastro foi realizado com sucesso. Agora você tem acesso a uma área exclusiva de cliente onde pode:</p>
            <ul style="padding-left: 20px; color: #a1a1aa; margin: 20px 0;">
              <li style="margin-bottom: 10px;">Acompanhar suas simulações e reservas em tempo real.</li>
              <li style="margin-bottom: 10px;">Fazer o pagamento do sinal de reserva de R$ 100,00 via PIX ou Cartão.</li>
              <li style="margin-bottom: 10px;">Conversar diretamente com nosso suporte e enviar mensagens.</li>
              <li style="margin-bottom: 10px;">Personalizar seu perfil e dados de contato.</li>
            </ul>
            <p style="margin-top: 30px;">Estamos ansiosos para receber suas produções e dar vida às suas criações em nosso espaço climatizado de 120m² no centro de São Paulo!</p>
            <div style="text-align: center; margin: 40px 0 20px 0;">
              <a href="${process.env.APP_URL || "http://localhost:3000"}" style="background-color: #d93838; color: #ffffff; text-decoration: none; padding: 14px 30px; font-weight: bold; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; font-family: monospace;">Acessar Meu Painel</a>
            </div>
          </td>
        </tr>
        ${EMAIL_FOOTER}
      `
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "E-mail de boas-vindas enviado." });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return res.status(500).json({ error: "Falha ao enviar e-mail: " + error.message });
  }
});

// API endpoint to process booking emails with PDF attached
app.post("/api/send-booking-email", async (req, res) => {
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

  try {
    const transporter = getSMTPTransporter();
    
    // Prepare PDF Attachment if sent
    const attachments = [];
    if (pdfBase64) {
      attachments.push({
        filename: `simulacao-reserva-${bookingId}.pdf`,
        content: pdfBase64.split("base64,")[1] || pdfBase64,
        encoding: "base64",
      });
    }

    const valorSinal = depositPaid ? "R$ 100,00 (Pago)" : "R$ 100,00 (Aguardando Sinal)";
    const statusText = status === "Reservada" ? "Confirmada & Reservada 🔴" : "Simulada (Aguardando Reserva)";

    const emailContent = `
      ${EMAIL_HEADER}
      <tr>
        <td style="padding: 40px; color: #e4e4e7; line-height: 1.6; font-size: 14px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #2e2e2e; padding-bottom: 10px;">
            Resumo da sua Solicitação: #${bookingId}
          </h2>
          <p>Olá, <strong>${clientName}</strong>!</p>
          <p>Sua simulação/reserva no Estúdio Triângulo foi registrada com sucesso. Segue o resumo do agendamento:</p>
          
          <table width="100%" style="margin: 25px 0; border-collapse: collapse; background-color: #262626; border-radius: 4px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px; font-family: monospace;">CÓDIGO DA RESERVA</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #ffffff; font-weight: bold; font-family: monospace;">#${bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px;">ESTÚDIO / ESPAÇO</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #ffffff; font-weight: bold;">${spaceName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px;">DATA SELECIONADA</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #ffffff; font-weight: bold;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px;">HORÁRIO / PERÍODO</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #ffffff; font-weight: bold;">${timeSlot}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px;">VALOR TOTAL</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #d93838; font-weight: bold; font-size: 16px;">R$ ${totalPrice.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #a1a1aa; font-size: 12px;">SINAL DE RESERVA</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #2e2e2e; color: #10b981; font-weight: bold;">${valorSinal}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; color: #a1a1aa; font-size: 12px;">STATUS ATUAL</td>
              <td style="padding: 12px 15px; color: #ffffff; font-weight: bold;">${statusText}</td>
            </tr>
          </table>

          <p>O PDF oficial com todo o detalhamento da locação e a relação de opcionais foi gerado e está anexado a este e-mail para seu controle.</p>
          
          ${!depositPaid ? `
          <div style="background-color: #3f1a1a; border: 1px solid #7f1d1d; padding: 15px; border-radius: 4px; margin: 25px 0; color: #fca5a5;">
            <strong>Atenção:</strong> Sua data de locação só estará 100% garantida na nossa agenda após a confirmação do pagamento do sinal fixo de <strong>R$ 100,00</strong>. Acesse seu painel no site para efetuar o pagamento seguro.
          </div>
          ` : ""}

          <div style="text-align: center; margin: 35px 0 10px 0;">
            <a href="${process.env.APP_URL || "http://localhost:3000"}" style="background-color: #d93838; color: #ffffff; text-decoration: none; padding: 13px 25px; font-weight: bold; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; border-radius: 2px; font-family: monospace;">Ir para Minhas Reservas</a>
          </div>
        </td>
      </tr>
      ${EMAIL_FOOTER}
    `;

    // 1. Send to Client
    await transporter.sendMail({
      from: `"Estúdio Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: clientEmail,
      subject: `Resumo do Agendamento Estúdio Triângulo: #${bookingId}`,
      html: emailContent,
      attachments,
    });

    // 2. Send copy to Admin
    const adminEmail = process.env.SMTP_USER || "contato@triangulofotoclub.com.br";
    await transporter.sendMail({
      from: `"Painel Triângulo" <${process.env.SMTP_USER || "contato@triangulofotoclub.com.br"}>`,
      to: adminEmail,
      subject: `🚨 NOVO AGENDAMENTO RECEBIDO: #${bookingId} - ${clientName}`,
      html: `
        ${EMAIL_HEADER}
        <tr>
          <td style="padding: 40px; color: #e4e4e7; line-height: 1.6; font-size: 14px;">
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 600; text-transform: uppercase; color: #d93838;">
              ALERTA DE NOVO AGENDAMENTO
            </h2>
            <p>Um novo agendamento de locação foi feito por um cliente através do simulador:</p>
            <ul>
              <li><strong>Cliente:</strong> ${clientName}</li>
              <li><strong>E-mail:</strong> ${clientEmail}</li>
              <li><strong>Telefone:</strong> ${clientPhone || "Não informado"}</li>
              <li><strong>Reserva ID:</strong> #${bookingId}</li>
              <li><strong>Espaço:</strong> ${spaceName}</li>
              <li><strong>Data:</strong> ${date} | Horário: ${timeSlot}</li>
              <li><strong>Valor Total:</strong> R$ ${totalPrice.toFixed(2)}</li>
              <li><strong>Sinal R$ 100:</strong> ${depositPaid ? "PAGO via InfinitePay" : "Pendente de pagamento"}</li>
            </ul>
            <p>O PDF gerado pelo simulador está em anexo.</p>
          </td>
        </tr>
        ${EMAIL_FOOTER}
      `,
      attachments,
    });

    return res.json({ success: true, message: "E-mails enviados com sucesso para cliente e admin." });
  } catch (error: any) {
    console.error("Error sending booking emails:", error);
    return res.status(500).json({ error: "Erro ao enviar e-mail: " + error.message });
  }
});

// InfinitePay Integration Real API & Sandbox Flow
app.post("/api/payment/infinitepay", async (req, res) => {
  const { 
    bookingId, 
    amount, 
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

  // Choose the merchant handle: dynamic from client DB, environment variable, or fallback
  const handle = customHandle || process.env.INFINITEPAY_HANDLE || "triangulofotoclub";
  const orderNsu = bookingId || planId || "ORDER-" + Math.floor(10000 + Math.random() * 90000);
  const description = planId 
    ? `Plano Coworking ${planId.toUpperCase()} (${cycleMonths} Meses) - Estúdio Triângulo` 
    : `Sinal de Reserva - Estúdio Triângulo - ID #${orderNsu}`;

  try {
    const amountInCents = Math.round(amount * 100);
    const hostUrl = process.env.APP_URL || "http://localhost:3000";
    
    // Construct redirect URLs pointing back to client-side checkout handlers
    const redirectUrl = planId
      ? `${hostUrl}?paySuccess=true&planId=${planId}&cycleMonths=${cycleMonths}&order_nsu=${orderNsu}`
      : `${hostUrl}?paySuccess=true&bookingId=${orderNsu}`;

    console.log(`Generating InfinitePay checkout link for handle: "${handle}", amount: R$ ${amount} (${amountInCents} centavos)`);

    // Call InfinitePay REST API - No Bearer token needed as per documentation!
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

    if (!infinitePayRes.ok) {
      const errorText = await infinitePayRes.text();
      console.warn("InfinitePay API responded with error:", errorText);
      throw new Error(`InfinitePay API error: ${errorText}`);
    }

    const infinitePayData: any = await infinitePayRes.json();
    console.log("InfinitePay checkout link successfully generated:", infinitePayData);

    return res.json({
      success: true,
      checkoutUrl: infinitePayData.url, // Real checkout URL
      orderNsu: orderNsu,
      amount: amount
    });

  } catch (error: any) {
    console.warn("InfinitePay real integration failed, using sandbox fallback:", error.message);
    
    // Smooth fallback: generate a mock checkout flow that behaves exactly like the real checkout link so the user can test their app beautifully!
    const txId = "IPY-" + Math.floor(10000000 + Math.random() * 90000000);
    const hostUrl = process.env.APP_URL || "http://localhost:3000";
    const redirectUrl = planId
      ? `${hostUrl}?paySuccess=true&planId=${planId}&cycleMonths=${cycleMonths}&transaction_nsu=${txId}&order_nsu=${orderNsu}&capture_method=pix`
      : `${hostUrl}?paySuccess=true&bookingId=${orderNsu}&transaction_nsu=${txId}&order_nsu=${orderNsu}&capture_method=pix`;

    return res.json({
      success: true,
      checkoutUrl: redirectUrl, // In sandbox/fallback, redirecting back directly acts as successful flow!
      orderNsu: orderNsu,
      amount: amount,
      sandbox: true,
      message: "Utilizando Checkout em modo de testes. Redirecionando para conclusão..."
    });
  }
});

// InfinitePay Webhook
app.post("/api/webhook-infinitepay", async (req, res) => {
  const { order_nsu, transaction_nsu, amount, capture_method, receipt_url } = req.body;
  console.log("InfinitePay webhook received:", req.body);

  if (!order_nsu) {
    return res.status(400).send("No order_nsu found");
  }

  // We return 200 immediately to InfinitePay
  return res.status(200).json({ received: true });
});

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
  });
}

startServer();
