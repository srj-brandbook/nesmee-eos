"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { productService } from "@/services/productService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FileUpload } from "@/components/ui/FileUpload";
import { ROUTES } from "@/constants/routes";
import {
  PRODUCT_MEASUREMENT_DIMENSIONS,
  PRODUCT_UNIT_PRESETS,
  PRODUCT_MEDIA_KINDS,
  PRODUCT_MEDIA_ROLES,
  MEASUREMENT_PRESETS,
  labelFor,
} from "@/constants/products";
import { ApiClientError } from "@/lib/api/apiClient";

const emptyProduct = {
  supplierId: "",
  name: "",
  brand: "",
  originCountry: "",
  category: "",
  tags: "",
  sku: "",
  hsCode: "",
  identifiers: { gtin: "", barcode: "", other: [] },
  measurements: [],
  attributes: [],
  description: "",
  highlights: "",
  packagingNotes: "",
  moq: { value: 0, unit: "" },
  leadTimeDays: 0,
  incotermCode: "",
  indicativePrice: 0,
  currency: "INR",
  media: [],
  notes: "",
};

function kindFromFile(file) {
  const type = `${file?.mimeType || file?.type || ""}`.toLowerCase();
  const resource = `${file?.resourceType || ""}`.toLowerCase();
  if (type.startsWith("video/") || resource === "video") return "video";
  if (type.startsWith("image/") || resource === "image") return "photo";
  return "document";
}

export function ProductForm({ productId }) {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const [form, setForm] = useState({ ...emptyProduct, supplierId: search.get("supplierId") || "" });
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productService.suppliers({ limit: 100 }).then((response) => setSuppliers(response.data.items || [])).catch(() => {});
    productService.categories().then((response) => setCategories(response.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    productService.get(productId).then((response) => {
      const product = response.data.product;
      setForm({
        ...emptyProduct,
        ...product,
        supplierId: product.supplierId || "",
        tags: (product.tags || []).join(", "),
        highlights: (product.highlights || []).join("\n"),
        identifiers: product.identifiers || { gtin: "", barcode: "", other: [] },
        moq: product.moq || { value: 0, unit: "" },
        media: product.media || [],
      });
    });
  }, [productId]);

  const payload = useMemo(() => ({
    ...form,
    tags: String(form.tags || "").split(",").map((item) => item.trim()).filter(Boolean),
    highlights: String(form.highlights || "").split("\n").map((item) => item.trim()).filter(Boolean),
    supplierId: form.supplierId,
    indicativePrice: Number(form.indicativePrice) || 0,
    leadTimeDays: Number(form.leadTimeDays) || 0,
    moq: { value: Number(form.moq?.value) || 0, unit: form.moq?.unit || "" },
  }), [form]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (productId) {
        await productService.update(productId, payload);
        toast.success("Product updated");
        router.push(`${ROUTES.products}/${productId}`);
      } else {
        const response = await productService.create(payload);
        toast.success("Product created");
        router.push(`${ROUTES.products}/${response.data.product.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields || {});
      } else setError("Could not save product");
    } finally {
      setLoading(false);
    }
  }

  function updateMedia(index, patch) {
    setForm((current) => ({
      ...current,
      media: current.media.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="font-display text-2xl font-semibold">{productId ? "Edit product" : "New product"}</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card>
        <CardHeader>Identity</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Select label="Supplier" requiredMark value={form.supplierId} error={fields.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>
            <option value="">Select a verified supplier</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
          <Input label="Name" requiredMark value={form.name} error={fields.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          <Input label="Category" value={form.category} list="product-categories" onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <datalist id="product-categories">
            {categories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input label="Origin country" value={form.originCountry} onChange={(event) => setForm({ ...form, originCountry: event.target.value })} />
          <Input label="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
          <Input label="HS code" value={form.hsCode} onChange={(event) => setForm({ ...form, hsCode: event.target.value })} />
          <Input label="GTIN" value={form.identifiers?.gtin || ""} onChange={(event) => setForm({ ...form, identifiers: { ...form.identifiers, gtin: event.target.value } })} />
          <Input label="Barcode" value={form.identifiers?.barcode || ""} onChange={(event) => setForm({ ...form, identifiers: { ...form.identifiers, barcode: event.target.value } })} />
          <Input label="Tags" value={form.tags} hint="Comma-separated" onChange={(event) => setForm({ ...form, tags: event.target.value })} className="md:col-span-2" />
          <div className="md:col-span-2">
            <Textarea label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <span>Measurements</span>
          <div className="flex flex-wrap gap-2">
            {MEASUREMENT_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((current) => ({ ...current, measurements: [...current.measurements, { ...preset, value: null, maxValue: null, notes: "" }] }))}
              >
                {preset.name}
              </Button>
            ))}
            <Button type="button" size="sm" onClick={() => setForm((current) => ({ ...current, measurements: [...current.measurements, { name: "", dimension: "custom", value: null, maxValue: null, unit: "", notes: "" }] }))}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {form.measurements.length ? form.measurements.map((item, index) => (
            <div key={`${item.name}-${index}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-6">
              <Input label="Name" value={item.name} onChange={(event) => setForm((current) => ({ ...current, measurements: current.measurements.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)) }))} />
              <Select label="Dimension" value={item.dimension || "custom"} onChange={(event) => setForm((current) => ({ ...current, measurements: current.measurements.map((row, rowIndex) => (rowIndex === index ? { ...row, dimension: event.target.value } : row)) }))}>
                {PRODUCT_MEASUREMENT_DIMENSIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <Input type="number" label="Value" value={item.value ?? ""} onChange={(event) => setForm((current) => ({ ...current, measurements: current.measurements.map((row, rowIndex) => (rowIndex === index ? { ...row, value: event.target.value === "" ? null : Number(event.target.value) } : row)) }))} />
              <Input type="number" label="Max" value={item.maxValue ?? ""} onChange={(event) => setForm((current) => ({ ...current, measurements: current.measurements.map((row, rowIndex) => (rowIndex === index ? { ...row, maxValue: event.target.value === "" ? null : Number(event.target.value) } : row)) }))} />
              <Input label="Unit" value={item.unit} list="product-units" onChange={(event) => setForm((current) => ({ ...current, measurements: current.measurements.map((row, rowIndex) => (rowIndex === index ? { ...row, unit: event.target.value } : row)) }))} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, measurements: current.measurements.filter((_, rowIndex) => rowIndex !== index) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )) : <p className="text-sm text-muted">Any unit is accepted. Use a preset or add a custom row.</p>}
          <datalist id="product-units">
            {PRODUCT_UNIT_PRESETS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Specifications</span>
          <Button type="button" size="sm" onClick={() => setForm((current) => ({ ...current, attributes: [...current.attributes, { group: "", name: "", value: "", unit: "" }] }))}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {form.attributes.length ? form.attributes.map((item, index) => (
            <div key={`${item.name}-${index}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-5">
              <Input label="Group" value={item.group} onChange={(event) => setForm((current) => ({ ...current, attributes: current.attributes.map((row, rowIndex) => (rowIndex === index ? { ...row, group: event.target.value } : row)) }))} />
              <Input label="Name" value={item.name} onChange={(event) => setForm((current) => ({ ...current, attributes: current.attributes.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)) }))} />
              <Input label="Value" value={item.value} onChange={(event) => setForm((current) => ({ ...current, attributes: current.attributes.map((row, rowIndex) => (rowIndex === index ? { ...row, value: event.target.value } : row)) }))} />
              <Input label="Unit" value={item.unit} onChange={(event) => setForm((current) => ({ ...current, attributes: current.attributes.map((row, rowIndex) => (rowIndex === index ? { ...row, unit: event.target.value } : row)) }))} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, attributes: current.attributes.filter((_, rowIndex) => rowIndex !== index) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )) : <p className="text-sm text-muted">Add any spec: nutrition, fabric, voltage, grade, or a custom group.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Commercial</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input type="number" label="MOQ" value={form.moq?.value || 0} onChange={(event) => setForm({ ...form, moq: { ...form.moq, value: Number(event.target.value) } })} />
          <Input label="MOQ unit" value={form.moq?.unit || ""} onChange={(event) => setForm({ ...form, moq: { ...form.moq, unit: event.target.value } })} />
          <Input type="number" label="Lead time (days)" value={form.leadTimeDays} onChange={(event) => setForm({ ...form, leadTimeDays: Number(event.target.value) })} />
          <Input label="Incoterm" value={form.incotermCode} onChange={(event) => setForm({ ...form, incotermCode: event.target.value })} />
          <Input type="number" label="Indicative price" value={form.indicativePrice} onChange={(event) => setForm({ ...form, indicativePrice: Number(event.target.value) })} />
          <Input label="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
          <div className="md:col-span-2">
            <Textarea label="Packaging notes" value={form.packagingNotes} onChange={(event) => setForm({ ...form, packagingNotes: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Highlights" value={form.highlights} hint="One per line" onChange={(event) => setForm({ ...form, highlights: event.target.value })} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Photos, videos, and documents</span>
          <Button
            type="button"
            size="sm"
            onClick={() => setForm((current) => ({ ...current, media: [...current.media, { kind: "photo", role: current.media.some((item) => item.role === "hero") ? "gallery" : "hero", caption: "", sortOrder: current.media.length, file: null }] }))}
          >
            <Plus className="h-4 w-4" />
            Add media
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {form.media.length ? form.media.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-2">
              <Select label="Kind" value={item.kind} onChange={(event) => updateMedia(index, { kind: event.target.value })}>
                {PRODUCT_MEDIA_KINDS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <Select label="Role" value={item.role} onChange={(event) => updateMedia(index, { role: event.target.value })}>
                {PRODUCT_MEDIA_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <div className="md:col-span-2">
                <FileUpload
                  label={labelFor(PRODUCT_MEDIA_KINDS, item.kind)}
                  folder="products"
                  resourceType={item.kind === "video" ? "video" : item.kind === "photo" ? "image" : "auto"}
                  accept={item.kind === "video" ? "video/*" : item.kind === "photo" ? "image/*" : "application/pdf,image/*,.doc,.docx"}
                  maxSizeMb={item.kind === "video" ? 80 : item.kind === "document" ? 25 : 10}
                  value={item.file}
                  onChange={(file) => updateMedia(index, { file, kind: file ? kindFromFile(file) : item.kind })}
                />
              </div>
              <Input label="Caption" value={item.caption || ""} onChange={(event) => updateMedia(index, { caption: event.target.value })} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, media: current.media.filter((_, rowIndex) => rowIndex !== index) }))}>
                  Remove
                </Button>
              </div>
            </div>
          )) : <p className="text-sm text-muted">Add photos, a product video, datasheets, or brochures.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Notes</CardHeader>
        <CardBody>
          <Textarea label="Internal notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={loading}>Save product</Button>
      </div>
    </form>
  );
}
