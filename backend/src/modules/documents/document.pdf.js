const fs = require("fs");
const logger = require("../../config/logger");
const ApiError = require("../../utils/ApiError");
const uploadService = require("../uploads/upload.service");

const A4 = [595.28, 841.89];
const MARGIN = 48;

function winAnsi(value) {
  return String(value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function asInlines(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function inlineText(items = []) {
  return asInlines(items)
    .map((item) => {
      if (!item) return "";
      if (item.type === "variable") return item.props?.value || item.props?.label || item.props?.path || "";
      if (item.type === "link") return inlineText(item.content || [{ type: "text", text: item.href || "" }]);
      if (item.type === "text") return item.text || "";
      if (Array.isArray(item.content)) return inlineText(item.content);
      return item.text || "";
    })
    .join("");
}

function wrapLines(text, font, size, maxWidth) {
  const words = winAnsi(text).split(/\s+/).filter((word) => word.length);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    const pieces = [];
    if (font.widthOfTextAtSize(word, size) <= maxWidth) pieces.push(word);
    else {
      let chunk = "";
      for (const char of word) {
        const next = chunk + char;
        if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
          pieces.push(chunk);
          chunk = char;
        } else chunk = next;
      }
      if (chunk) pieces.push(chunk);
    }
    for (const piece of pieces) {
      const next = line ? `${line} ${piece}` : piece;
      if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
        lines.push(line);
        line = piece;
      } else line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function chromeCandidates() {
  const paths = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);
  return [...new Set(paths.filter((file) => fs.existsSync(file)))];
}

async function launchChrome() {
  const { chromium } = require("playwright-core");
  const attempts = [{ channel: "chrome" }, { channel: "msedge" }, { channel: "chromium" }, ...chromeCandidates().map((executablePath) => ({ executablePath })), {}];
  let lastError = null;
  for (const options of attempts) {
    try {
      return await chromium.launch({
        ...options,
        headless: true,
        args: ["--disable-gpu", "--font-render-hinting=none", "--no-sandbox"],
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No Chrome/Chromium available for PDF rendering");
}

async function playwrightPdf(html) {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

async function layoutPdf({ title = "Document", docNumber = "", content = [], letterhead = {}, company = {} } = {}) {
  const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.11, 0.19);
  const muted = rgb(0.39, 0.45, 0.55);
  const accent = rgb(0.05, 0.65, 0.91);
  const width = A4[0] - MARGIN * 2;
  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  function newPage() {
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
  }

  function ensure(space) {
    if (y - space < MARGIN) newPage();
  }

  function drawLines(lines, { size = 11, type = font, color = ink, gap = 16, align = "left" } = {}) {
    for (const line of lines) {
      ensure(gap);
      const textWidth = type.widthOfTextAtSize(line, size);
      let x = MARGIN;
      if (align === "center") x = MARGIN + (width - textWidth) / 2;
      if (align === "right") x = A4[0] - MARGIN - textWidth;
      page.drawText(line, { x, y, size, font: type, color });
      y -= gap;
    }
  }

  function para(text, options = {}) {
    const size = options.size || 11;
    const type = options.type || font;
    drawLines(wrapLines(text, type, size, width), options);
  }

  const name = letterhead.legalName || company.legalName || company.name || "";
  const address = [letterhead.address || company.address, company.city, company.state, company.pincode, company.country]
    .filter(Boolean)
    .join(", ");
  if (name) {
    para(name, { size: 16, type: bold, gap: 18 });
    if (address) para(address, { size: 9, color: muted, gap: 12 });
    if (company.gstin) para(`GSTIN ${company.gstin}`, { size: 9, color: muted, gap: 12 });
    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4[0] - MARGIN, y },
      thickness: 2,
      color: accent,
    });
    y -= 22;
  }

  const metaLeft = winAnsi(title);
  const metaRight = winAnsi(docNumber);
  ensure(16);
  page.drawText(metaLeft, { x: MARGIN, y, size: 10, font, color: muted });
  page.drawText(metaRight, {
    x: A4[0] - MARGIN - bold.widthOfTextAtSize(metaRight, 10),
    y,
    size: 10,
    font: bold,
    color: muted,
  });
  y -= 22;

  function walk(blocks = [], list = false) {
    for (const block of blocks) {
      if (!block) continue;
      const align = block.props?.textAlignment || "left";
      const text = inlineText(block.content);
      switch (block.type) {
        case "heading": {
          const level = Math.min(3, Math.max(1, Number(block.props?.level) || 1));
          const size = level === 1 ? 20 : level === 2 ? 14 : 12;
          y -= level === 1 ? 6 : 10;
          para(text, { size, type: bold, gap: size + 6, align });
          break;
        }
        case "quote":
          ensure(20);
          page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: MARGIN, y: y - 8 }, thickness: 3, color: accent });
          drawLines(wrapLines(text, font, 11, width - 16), { size: 11, color: rgb(0.2, 0.25, 0.33), gap: 15 });
          y -= 6;
          break;
        case "bulletListItem":
        case "bulletedListItem":
        case "checkListItem":
        case "numberedListItem":
          para(`${list || block.type === "numberedListItem" ? "•" : "•"}  ${text}`, { size: 11, gap: 15 });
          if (block.children?.length) walk(block.children, true);
          break;
        case "codeBlock":
          para(text, { size: 10, gap: 14 });
          break;
        case "pageBreak":
          newPage();
          break;
        case "signature": {
          y -= 18;
          ensure(70);
          page.drawLine({
            start: { x: MARGIN, y },
            end: { x: MARGIN + 180, y },
            thickness: 1,
            color: rgb(0.58, 0.64, 0.72),
          });
          y -= 16;
          para(block.props?.name || company.signatoryName || "Authorized signatory", { size: 11, type: bold, gap: 14 });
          if (block.props?.title || company.signatoryTitle) {
            para(block.props?.title || company.signatoryTitle, { size: 9, color: muted, gap: 14 });
          }
          y -= 8;
          break;
        }
        case "table": {
          const rows = block.content?.rows || block.props?.rows || [];
          rows.forEach((row) => {
            const cells = (row.cells || []).map((cell) => inlineText(cell));
            para(cells.join("   |   "), { size: 10, gap: 14 });
          });
          break;
        }
        case "image":
        case "file":
          if (block.props?.caption || block.props?.name) para(block.props.caption || block.props.name, { size: 10, color: muted, gap: 14 });
          break;
        default:
          if (text) {
            para(text, { size: 11, gap: 16, align });
            y -= 2;
          }
          if (!list && block.children?.length) walk(block.children);
      }
    }
  }

  walk(content);
  const footer = letterhead.footer || [company.legalName || company.name, company.supportEmail].filter(Boolean).join("  ·  ");
  if (footer) {
    y -= 18;
    para(footer, { size: 9, color: muted, gap: 12 });
  }

  return Buffer.from(await pdf.save());
}

async function fallbackPdf(html, title = "Document") {
  return layoutPdf({ title, html, content: [] });
}

async function htmlToPdf(html, title, meta = {}) {
  const payload = {
    html,
    title: meta.title || title,
    docNumber: meta.docNumber || "",
    content: meta.content || [],
    letterhead: meta.letterhead || {},
    company: meta.company || {},
  };
  if (process.env.NODE_ENV === "test") return layoutPdf(payload);
  try {
    return await playwrightPdf(html);
  } catch (error) {
    logger.warn({ err: error }, "Playwright PDF failed; using layout renderer");
    return layoutPdf(payload);
  }
}

async function storePdf(buffer, filename) {
  if (!uploadService.configured()) {
    return {
      url: "",
      publicId: "",
      name: filename,
      size: buffer.length,
      mimeType: "application/pdf",
      type: "application/pdf",
      resourceType: "image",
      format: "pdf",
      pages: 0,
      kind: "generated",
    };
  }
  const uploaded = await uploadService.uploadBuffer({ buffer, folder: "documents", filename, resourceType: "image" });
  return { ...uploaded, kind: "generated" };
}

async function fetchBytes(url) {
  if (!url) throw ApiError.badRequest("Missing file url");
  const response = await fetch(url);
  if (!response.ok) throw ApiError.badRequest("Could not download an attachment for merging");
  return Buffer.from(await response.arrayBuffer());
}

function isPdfMeta(file) {
  const type = `${file?.mimeType || ""} ${file?.type || ""} ${file?.name || ""} ${file?.url || ""}`.toLowerCase();
  return type.includes("pdf") || file?.format === "pdf";
}

async function fileToPdfBytes(file) {
  let bytes = null;
  if (file?.publicId || file?.url) {
    try {
      bytes = await uploadService.downloadBuffer(file);
    } catch {
      if (file?.url) {
        try {
          bytes = await fetchBytes(file.url);
        } catch {
          bytes = null;
        }
      }
    }
  }
  if (!bytes) throw ApiError.badRequest("Attachment is missing a downloadable file");
  if (isPdfMeta(file) || bytes.slice(0, 5).toString() === "%PDF-") return bytes;
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  let image;
  const mime = `${file.mimeType || file.type || ""}`.toLowerCase();
  try {
    if (mime.includes("png")) image = await pdf.embedPng(bytes);
    else image = await pdf.embedJpg(bytes);
  } catch {
    throw ApiError.badRequest(`Cannot merge ${file.name || "attachment"} into a PDF packet`);
  }
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return Buffer.from(await pdf.save());
}

async function mergePdfs(files) {
  const { PDFDocument } = require("pdf-lib");
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = Buffer.isBuffer(file) ? file : await fileToPdfBytes(file);
    const part = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(part, part.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return Buffer.from(await merged.save());
}

module.exports = { htmlToPdf, storePdf, mergePdfs, fetchBytes, fileToPdfBytes, fallbackPdf, layoutPdf };
