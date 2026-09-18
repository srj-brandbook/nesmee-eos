"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { formService } from "@/services/formService";
import {
  cloneDefinition,
  createField,
  createSection,
  createRule,
  createConditionGroup,
  createValidator,
  uniqueKey,
  toFieldKey,
  validateFormConfiguration,
} from "@/lib/form-builder/engine";

const FormBuilderContext = createContext(null);

function workingCopy(form) {
  const version = form.draft || form.published;
  if (!version) {
    return {
      name: form.name,
      description: form.description,
      version: "1.0",
      status: "draft",
      sections: [createSection({ title: "General" })],
      fields: [],
      rules: [],
      documents: [],
      stages: [],
    };
  }
  return cloneDefinition({
    name: version.name || form.name,
    description: version.description || form.description,
    version: version.version,
    status: version.status,
    sections: version.sections || [],
    fields: version.fields || [],
    rules: version.rules || [],
    documents: version.documents || [],
    stages: version.stages || [],
  });
}

export function FormBuilderProvider({ formId, children }) {
  const [form, setForm] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [rightTab, setRightTab] = useState("properties");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loadError, setLoadError] = useState("");
  const [configResult, setConfigResult] = useState(null);
  const dirtyRef = useRef(false);
  const definitionRef = useRef(null);
  const saveTimer = useRef(null);

  const persist = useCallback(
    async (nextDefinition) => {
      setSaveStatus("saving");
      try {
        const payload = nextDefinition || definitionRef.current;
        const response = await formService.saveDraft(formId, {
          name: payload.name,
          description: payload.description,
          sections: payload.sections,
          fields: payload.fields,
          rules: payload.rules,
          documents: payload.documents,
          stages: payload.stages,
        });
        setForm(response.data.form);
        dirtyRef.current = false;
        setSaveStatus("saved");
        return response.data.form;
      } catch (error) {
        setSaveStatus("error");
        throw error;
      }
    },
    [formId]
  );

  const patch = useCallback((updater) => {
    setDefinition((current) => {
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      definitionRef.current = next;
      dirtyRef.current = true;
      setSaveStatus("idle");
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let response = await formService.get(formId);
        let nextForm = response.data.form;
        if (!nextForm.draft && nextForm.published) {
          response = await formService.createDraft(formId);
          nextForm = response.data.form;
        }
        if (!active) return;
        const copy = workingCopy(nextForm);
        setForm(nextForm);
        setDefinition(copy);
        definitionRef.current = copy;
        setSelectedSectionId(copy.sections[0]?.id || null);
      } catch (error) {
        if (active) setLoadError(error.message || "Unable to load form");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [formId]);

  useEffect(() => {
    if (!definition || !dirtyRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist().catch(() => {});
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [definition, persist]);

  const selectedField = definition?.fields?.find((field) => field.id === selectedFieldId) || null;

  const selectField = useCallback((fieldId, forceOpen = false) => {
    setSelectedFieldId((current) => {
      if (!fieldId) return null;
      if (!forceOpen && current === fieldId) return null;
      return fieldId;
    });
    if (fieldId) setRightTab("properties");
  }, []);

  const addField = useCallback(
    (type, sectionId) => {
      let createdId = null;
      patch((current) => {
        const targetSection = sectionId || selectedSectionId || current.sections[0]?.id;
        const field = createField(type, { sectionId: targetSection }, current.fields.map((item) => item.key));
        createdId = field.id;
        return { ...current, fields: [...current.fields, field] };
      });
      if (createdId) {
        selectField(createdId, true);
      }
    },
    [patch, selectedSectionId, selectField]
  );

  const updateField = useCallback(
    (fieldId, updates) => {
      patch((current) => ({
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId) return field;
          const next = { ...field, ...updates, metadata: { ...field.metadata, ...(updates.metadata || {}) }, layout: { ...field.layout, ...(updates.layout || {}) } };
          if (updates.key) {
            const others = current.fields.filter((item) => item.id !== fieldId).map((item) => item.key);
            next.key = uniqueKey(toFieldKey(updates.key, field.type), others);
          }
          return next;
        }),
      }));
    },
    [patch]
  );

  const removeField = useCallback(
    (fieldId) => {
      patch((current) => ({ ...current, fields: current.fields.filter((field) => field.id !== fieldId) }));
      setSelectedFieldId((current) => (current === fieldId ? null : current));
    },
    [patch]
  );

  const duplicateField = useCallback(
    (fieldId) => {
      patch((current) => {
        const field = current.fields.find((item) => item.id === fieldId);
        if (!field) return current;
        const copy = createField(field.type, { ...field, id: undefined, label: `${field.label} copy` }, current.fields.map((item) => item.key));
        const index = current.fields.findIndex((item) => item.id === fieldId);
        const fields = [...current.fields];
        fields.splice(index + 1, 0, copy);
        return { ...current, fields };
      });
    },
    [patch]
  );

  const moveField = useCallback(
    (fieldId, { sectionId, index }) => {
      patch((current) => {
        const from = current.fields.findIndex((field) => field.id === fieldId);
        if (from < 0) return current;
        const fields = [...current.fields];
        const [item] = fields.splice(from, 1);
        item.sectionId = sectionId || item.sectionId;
        const sectionFields = fields.filter((field) => field.sectionId === item.sectionId);
        const before = fields.filter((field) => field.sectionId !== item.sectionId);
        const target = Math.max(0, Math.min(index ?? sectionFields.length, sectionFields.length));
        sectionFields.splice(target, 0, item);
        const otherOrder = current.sections.filter((section) => section.id !== item.sectionId).flatMap((section) => fields.filter((field) => field.sectionId === section.id));
        const merged = current.sections.flatMap((section) =>
          section.id === item.sectionId ? sectionFields : otherOrder.filter((field) => field.sectionId === section.id)
        );
        const leftovers = before.filter((field) => !current.sections.some((section) => section.id === field.sectionId));
        return { ...current, fields: [...merged, ...leftovers] };
      });
    },
    [patch]
  );

  const addSection = useCallback(() => {
    patch((current) => {
      const section = createSection({ title: `Section ${current.sections.length + 1}`, order: current.sections.length });
      return { ...current, sections: [...current.sections, section] };
    });
  }, [patch]);

  const updateSection = useCallback(
    (sectionId, updates) => {
      patch((current) => ({
        ...current,
        sections: current.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
      }));
    },
    [patch]
  );

  const removeSection = useCallback(
    (sectionId) => {
      patch((current) => {
        if (current.sections.length <= 1) return current;
        const fallback = current.sections.find((section) => section.id !== sectionId);
        return {
          ...current,
          sections: current.sections.filter((section) => section.id !== sectionId),
          fields: current.fields.map((field) => (field.sectionId === sectionId ? { ...field, sectionId: fallback.id } : field)),
        };
      });
    },
    [patch]
  );

  const reorderSections = useCallback(
    (fromIndex, toIndex) => {
      patch((current) => {
        const sections = [...current.sections];
        const [item] = sections.splice(fromIndex, 1);
        sections.splice(toIndex, 0, item);
        return { ...current, sections: sections.map((section, index) => ({ ...section, order: index })) };
      });
    },
    [patch]
  );

  const upsertFieldRule = useCallback(
    (field, when, actions) => {
      patch((current) => {
        const existing = current.rules.find((rule) => rule.targetFieldKey === field.key);
        const rule = existing
          ? { ...existing, when, then: actions, active: true }
          : createRule({
              name: `${field.label} conditions`,
              targetFieldKey: field.key,
              when,
              then: actions,
              priority: 60,
            });
        const rules = existing ? current.rules.map((item) => (item.id === existing.id ? rule : item)) : [...current.rules, rule];
        return { ...current, rules };
      });
    },
    [patch]
  );

  const saveRule = useCallback(
    (rule) => {
      patch((current) => {
        const exists = current.rules.some((item) => item.id === rule.id);
        return { ...current, rules: exists ? current.rules.map((item) => (item.id === rule.id ? rule : item)) : [...current.rules, rule] };
      });
    },
    [patch]
  );

  const removeRule = useCallback(
    (ruleId) => {
      patch((current) => ({ ...current, rules: current.rules.filter((rule) => rule.id !== ruleId) }));
    },
    [patch]
  );

  const addValidatorToField = useCallback(
    (fieldId, type) => {
      const field = definitionRef.current?.fields.find((item) => item.id === fieldId);
      if (!field) return;
      updateField(fieldId, { validators: [...(field.validators || []), createValidator(type)] });
    },
    [updateField]
  );

  const publish = useCallback(async () => {
    await persist();
    const validation = await formService.validateConfig(formId);
    setConfigResult(validation.data.validation);
    if (!validation.data.validation.ok) return validation.data.validation;
    const response = await formService.publish(formId, { allowWarnings: true });
    setForm(response.data.form);
    setConfigResult(response.data.validation);
    if (response.data.form.draft) {
      const copy = workingCopy(response.data.form);
      setDefinition(copy);
      definitionRef.current = copy;
    }
    return response.data.validation;
  }, [formId, persist]);

  const updateMeta = useCallback(async (payload) => {
    const response = await formService.update(formId, payload);
    setForm(response.data.form);
    return response.data.form;
  }, [formId]);

  const value = useMemo(
    () => ({
      form,
      definition,
      selectedField,
      selectedFieldId,
      selectedSectionId,
      rightTab,
      saveStatus,
      loadError,
      configResult,
      setSelectedFieldId,
      selectField,
      setSelectedSectionId,
      setRightTab,
      patch,
      addField,
      updateField,
      removeField,
      duplicateField,
      moveField,
      addSection,
      updateSection,
      removeSection,
      reorderSections,
      upsertFieldRule,
      saveRule,
      removeRule,
      addValidatorToField,
      persist,
      publish,
      updateMeta,
      validateNow: () => setConfigResult(validateFormConfiguration(definitionRef.current || definition)),
    }),
    [
      form,
      definition,
      selectedField,
      selectedFieldId,
      selectedSectionId,
      rightTab,
      saveStatus,
      loadError,
      configResult,
      selectField,
      patch,
      addField,
      updateField,
      removeField,
      duplicateField,
      moveField,
      addSection,
      updateSection,
      removeSection,
      reorderSections,
      upsertFieldRule,
      saveRule,
      removeRule,
      addValidatorToField,
      persist,
      publish,
      updateMeta,
    ]
  );

  return <FormBuilderContext.Provider value={value}>{children}</FormBuilderContext.Provider>;
}

export function useFormBuilder() {
  const value = useContext(FormBuilderContext);
  if (!value) throw new Error("useFormBuilder must be used within FormBuilderProvider");
  return value;
}
