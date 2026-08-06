/**
 * Automatic Sitemap Generator for Estúdio Triângulo
 * Generates SEO-optimized sitemap.xml for Google, Bing, and search engine crawling.
 */

import fs from "fs";
import path from "path";

const SITE_URL = "https://trianguloestudio.online";
const TODAY = new Date().toISOString().split("T")[0];

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  title?: string;
  images?: { loc: string; title: string }[];
}

const urls: SitemapUrl[] = [
  {
    loc: `${SITE_URL}/`,
    lastmod: TODAY,
    changefreq: "daily",
    priority: 1.0,
    title: "Estúdio Triângulo - Locação de Estúdio Fotográfico em São Paulo",
    images: [
      {
        loc: "https://triangulofotoclub.com.br/locacao/estudio/01-Escritorio.webp",
        title: "Estúdio Triângulo Fotoclub - Fundo Infinito e Camarim"
      }
    ]
  },
  {
    loc: `${SITE_URL}/#espacos`,
    lastmod: TODAY,
    changefreq: "weekly",
    priority: 0.9,
    title: "Espaços & Fundo Infinito - Estúdio Triângulo"
  },
  {
    loc: `${SITE_URL}/#agendamento`,
    lastmod: TODAY,
    changefreq: "daily",
    priority: 0.9,
    title: "Agendamento e Simulação de Locação Online"
  },
  {
    loc: `${SITE_URL}/#planos`,
    lastmod: TODAY,
    changefreq: "weekly",
    priority: 0.8,
    title: "Planos de Membership & Coworking de Fotografia"
  },
  {
    loc: `${SITE_URL}/#portfolio`,
    lastmod: TODAY,
    changefreq: "weekly",
    priority: 0.8,
    title: "Portfólio de Ensaios e Produções no Estúdio"
  },
  {
    loc: `${SITE_URL}/#equipamentos`,
    lastmod: TODAY,
    changefreq: "weekly",
    priority: 0.7,
    title: "Equipamentos de Iluminação e Câmeras para Aluguel"
  },
  {
    loc: `${SITE_URL}/#localizacao`,
    lastmod: TODAY,
    changefreq: "monthly",
    priority: 0.7,
    title: "Localização do Estúdio no Centro de São Paulo"
  },
  {
    loc: `${SITE_URL}/#contato`,
    lastmod: TODAY,
    changefreq: "monthly",
    priority: 0.7,
    title: "Contato e WhatsApp - Estúdio Triângulo"
  }
];

function generateSitemapXml(urlList: SitemapUrl[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd\n`;
  xml += `                            http://www.google.com/schemas/sitemap-image/1.1\n`;
  xml += `                            http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">\n`;

  urlList.forEach((item) => {
    xml += `  <url>\n`;
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority.toFixed(1)}</priority>\n`;

    if (item.images && item.images.length > 0) {
      item.images.forEach((img) => {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${img.loc}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
        xml += `    </image:image>\n`;
      });
    }

    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function main() {
  const xmlContent = generateSitemapXml(urls);
  const publicDir = path.join(process.cwd(), "public");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(outputPath, xmlContent, "utf8");
  console.log(`[SEO] Sitemap successfully generated at: ${outputPath}`);

  // Also verify robots.txt
  const robotsPath = path.join(publicDir, "robots.txt");
  const robotsContent = `# robots.txt for https://trianguloestudio.online/\nUser-agent: *\nAllow: /\n\n# Sitemap URL for Google / Bing Search Console\nSitemap: https://trianguloestudio.online/sitemap.xml\n`;
  fs.writeFileSync(robotsPath, robotsContent, "utf8");
  console.log(`[SEO] robots.txt successfully generated at: ${robotsPath}`);
}

main();
