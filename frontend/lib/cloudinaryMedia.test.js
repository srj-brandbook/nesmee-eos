import { cloudinaryPageUrl, isPdfFile, previewUrl, resourceTypeForFile } from "./cloudinaryMedia";

const pdf = {
  name: "GST-certificate.pdf",
  url: "https://res.cloudinary.com/jamgx6yu/image/upload/v1789456680/nesmee/eos/forms/vwgtmhzfctdsjxczmlcy.pdf",
  publicId: "nesmee/eos/forms/vwgtmhzfctdsjxczmlcy",
  type: "application/pdf",
  mimeType: "application/pdf",
  format: "pdf",
  resourceType: "image",
  pages: 0,
};

describe("cloudinaryMedia PDF preview", () => {
  it("detects PDFs from format even without a .pdf suffix in the url", () => {
    expect(isPdfFile({ ...pdf, url: pdf.url.replace(/\.pdf$/, ""), name: "certificate" })).toBe(true);
    expect(resourceTypeForFile(pdf)).toBe("image");
  });

  it("renders page previews as jpg paths that do not end in .pdf", () => {
    const url = previewUrl(pdf, 1, { width: 1600 });
    expect(url).toContain("/image/upload/f_jpg,pg_1,q_auto,c_limit,w_1600/");
    expect(url.endsWith(".jpg")).toBe(true);
    expect(url.endsWith(".pdf")).toBe(false);
    expect(cloudinaryPageUrl(pdf, 2, { width: 240 })).toContain("pg_2");
  });
});
