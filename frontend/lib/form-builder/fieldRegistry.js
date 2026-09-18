import {
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  CircleDot,
  CheckSquare,
  AlignLeft,
  Upload,
  FileText,
  MapPin,
  Globe,
  Map,
  IndianRupee,
  Percent,
  Rows3,
} from "lucide-react";
import { FIELD_TYPES } from "./engine";
import { FieldInput } from "@/components/form-builder/fields/FieldInput";

const ICONS = {
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  CircleDot,
  CheckSquare,
  AlignLeft,
  Upload,
  FileText,
  MapPin,
  Globe,
  Map,
  IndianRupee,
  Percent,
  Rows3,
};

export const fieldRegistry = Object.fromEntries(
  Object.values(FIELD_TYPES).map((meta) => [
    meta.type,
    {
      ...meta,
      Icon: ICONS[meta.icon] || Type,
      component: FieldInput,
    },
  ])
);

export function getFieldEntry(type) {
  return fieldRegistry[type] || fieldRegistry.text;
}

export function libraryGroups() {
  return [
    { id: "basic", label: "Basic Fields", items: Object.values(fieldRegistry).filter((item) => item.group === "basic") },
    { id: "advanced", label: "Advanced Fields", items: Object.values(fieldRegistry).filter((item) => item.group === "advanced") },
  ];
}
