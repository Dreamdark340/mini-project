import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface Branding {
  logoPath: string;
  watermark: string;
  disclaimer: string;
}

const brandingFile = path.join(__dirname, '../../branding.json');
let branding: Branding = { logoPath: '', watermark: '', disclaimer: '' };
try {
  branding = JSON.parse(fs.readFileSync(brandingFile, 'utf8')) as Branding;
} catch {
  console.warn('branding.json missing or invalid; using defaults');
}

export async function generatePayslipPDF(title: string, bodyLines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // watermark
  if (branding.watermark) {
    page.drawText(branding.watermark, {
      x: width / 2 - font.widthOfTextAtSize(branding.watermark, 50) / 2,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.9, 0.9, 0.9),
      rotate: { degrees: 45 },
      opacity: 0.15,
    });
  }

  // title
  page.drawText(title, { x: 50, y: height - 80, size: 18, font });

  // body
  let y = height - 120;
  bodyLines.forEach((l) => {
    page.drawText(l, { x: 50, y, size: 12, font });
    y -= 20;
  });

  // disclaimer
  if (branding.disclaimer) {
    page.drawText(branding.disclaimer, {
      x: 50,
      y: 40,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return await pdf.save();
}