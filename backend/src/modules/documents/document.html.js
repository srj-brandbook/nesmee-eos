function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asInlines(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function tableRows(block) {
  if (block?.content?.rows) return block.content.rows;
  if (block?.props?.rows) return block.props.rows;
  if (Array.isArray(block?.content)) return block.content;
  return [];
}

function tableCells(row) {
  if (Array.isArray(row?.cells)) return row.cells;
  if (Array.isArray(row)) return row;
  return [];
}

function inlineHtml(items = []) {
  return asInlines(items)
    .map((item) => {
      if (!item) return "";
      if (item.type === "variable") {
        const text = item.props?.value || item.props?.label || item.props?.path || "";
        if (item.props?.missing) return `<span class="chip missing">${escapeHtml(text)}</span>`;
        return `<span class="value">${escapeHtml(text)}</span>`;
      }
      if (item.type === "link") {
        const href = escapeHtml(item.href || item.props?.url || "#");
        return `<a href="${href}">${inlineHtml(item.content || [{ type: "text", text: item.href || "" }])}</a>`;
      }
      if (item.type === "text") {
        let html = escapeHtml(item.text);
        const styles = item.styles || {};
        if (styles.bold) html = `<strong>${html}</strong>`;
        if (styles.italic) html = `<em>${html}</em>`;
        if (styles.underline) html = `<u>${html}</u>`;
        if (styles.strike) html = `<s>${html}</s>`;
        if (styles.code) html = `<code>${html}</code>`;
        return html;
      }
      if (Array.isArray(item.content)) return inlineHtml(item.content);
      return escapeHtml(item.text || "");
    })
    .join("");
}

function listTag(block) {
  if (block.type === "bulletListItem" || block.type === "bulletedListItem") return "ul";
  if (block.type === "numberedListItem" || block.type === "numberedListItem") return "ol";
  if (block.type === "checkListItem") return "ul";
  return "";
}

function blockInner(block) {
  const align = block.props?.textAlignment && block.props.textAlignment !== "left" ? ` style="text-align:${escapeHtml(block.props.textAlignment)}"` : "";
  const text = inlineHtml(asInlines(block.content));
  switch (block.type) {
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(block.props?.level) || 1));
      return `<h${level}${align}>${text}</h${level}>`;
    }
    case "paragraph":
      return `<p${align}>${text || "&nbsp;"}</p>`;
    case "quote":
      return `<blockquote${align}>${text}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${text}</code></pre>`;
    case "bulletListItem":
    case "bulletedListItem":
    case "numberedListItem":
      return `<li${align}>${text}${renderBlocks(block.children || [])}</li>`;
    case "checkListItem": {
      const checked = block.props?.checked ? " checked" : "";
      return `<li class="check"${align}><input type="checkbox" disabled${checked}/> ${text}</li>`;
    }
    case "table": {
      const headerRows = Number(block.content?.headerRows || 0);
      return `<table>${tableRows(block)
        .map((row, rowIndex) => {
          const tag = rowIndex < headerRows ? "th" : "td";
          return `<tr>${tableCells(row)
            .map((cell) => `<${tag}>${inlineHtml(asInlines(cell))}</${tag}>`)
            .join("")}</tr>`;
        })
        .join("")}</table>`;
    }
    case "image": {
      const url = block.props?.url || "";
      const caption = block.props?.caption || "";
      if (!url) return "";
      return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}"/>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    }
    case "file": {
      const name = block.props?.name || block.props?.url || "Attachment";
      return `<p class="file">${escapeHtml(name)}</p>`;
    }
    case "pageBreak":
      return `<div class="page-break"></div>`;
    case "signature": {
      const name = block.props?.name || "Authorized signatory";
      const title = block.props?.title || "";
      return `<div class="signature"><div class="line"></div><p>${escapeHtml(name)}</p>${title ? `<p class="muted">${escapeHtml(title)}</p>` : ""}</div>`;
    }
    default:
      return text ? `<p${align}>${text}</p>` : "";
  }
}

function renderBlocks(blocks = []) {
  if (!Array.isArray(blocks) || !blocks.length) return "";
  let html = "";
  let listType = "";
  function closeList() {
    if (listType) {
      html += `</${listType}>`;
      listType = "";
    }
  }
  for (const block of blocks) {
    const nextList = listTag(block);
    if (nextList !== listType) {
      closeList();
      if (nextList) {
        listType = nextList;
        html += `<${listType}>`;
      }
    }
    html += blockInner(block);
    if (!nextList && Array.isArray(block.children) && block.children.length) {
      html += renderBlocks(block.children);
    }
  }
  closeList();
  return html;
}

function letterheadHtml(letterhead = {}, company = {}) {
  const name = letterhead.legalName || company.legalName || company.name || "";
  const address = [letterhead.address || company.address, company.city, company.state, company.pincode, company.country]
    .filter(Boolean)
    .join(", ");
  const logo = letterhead.showLogo === false ? "" : company.logoUrl;
  return `
    <header class="letterhead">
      ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt=""/>` : ""}
      <div>
        <div class="company">${escapeHtml(name)}</div>
        ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ""}
        ${company.gstin ? `<div class="muted">GSTIN ${escapeHtml(company.gstin)}</div>` : ""}
      </div>
    </header>
  `;
}

function documentToHtml({ title, docNumber, content, letterhead, company, footer }) {
  const body = renderBlocks(content);
  const foot = footer || letterhead?.footer || [company?.legalName || company?.name, company?.supportEmail].filter(Boolean).join(" · ");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title || "Document")}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #0f1c30; font-size: 12.5px; line-height: 1.55; margin: 0; }
    .letterhead { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 22px; }
    .logo { height: 48px; max-width: 140px; object-fit: contain; }
    .company { font-size: 18px; font-weight: 700; }
    .muted { color: #64748b; font-size: 11px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 18px 0 8px; }
    h3 { font-size: 13px; margin: 14px 0 6px; }
    p { margin: 0 0 8px; }
    blockquote { border-left: 3px solid #0ea5e9; margin: 8px 0; padding: 4px 12px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
    td, th { border: 1px solid #dbe4ee; padding: 6px 8px; vertical-align: top; }
    .value { font-weight: 600; }
    .chip { display: inline-block; background: #e0f2fe; color: #0369a1; border-radius: 999px; padding: 0 7px; font-size: 11px; }
    .chip.missing { background: #fef3c7; color: #92400e; }
    .page-break { break-before: page; height: 0; }
    .signature { margin-top: 36px; width: 220px; }
    .signature .line { border-bottom: 1px solid #94a3b8; height: 36px; margin-bottom: 6px; }
    figure { margin: 12px 0; }
    img { max-width: 100%; }
    footer { position: running(docfooter); font-size: 10px; color: #64748b; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 18px; color: #64748b; font-size: 11px; }
  </style>
</head>
<body>
  ${letterheadHtml(letterhead, company)}
  <div class="meta">
    <div>${escapeHtml(title || "")}</div>
    <div>${escapeHtml(docNumber || "")}</div>
  </div>
  ${body}
  ${foot ? `<p class="muted" style="margin-top:32px">${escapeHtml(foot)}</p>` : ""}
</body>
</html>`;
}

module.exports = { documentToHtml, renderBlocks, escapeHtml };
