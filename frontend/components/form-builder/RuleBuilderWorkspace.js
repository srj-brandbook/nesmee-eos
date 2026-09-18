"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Tabs } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { ConditionTreeEditor } from "./ConditionTreeEditor";
import { ActionListEditor } from "./ActionListEditor";
import { BuilderDrawer } from "./BuilderDrawer";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { createRule, createConditionGroup, summarizeRule, evaluateRule, formatValue } from "@/lib/form-builder/engine";
import { ROUTES } from "@/constants/routes";
import { useToast } from "@/contexts/ToastProvider";

function Palette({ definition, paletteTab, setPaletteTab, insertField }) {
  return (
    <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Fields & elements</h3>
      <Tabs
        tabs={[
          { value: "fields", label: "Fields" },
          { value: "documents", label: "Docs" },
          { value: "stages", label: "Stages" },
          { value: "others", label: "Other" },
        ]}
        value={paletteTab}
        onChange={setPaletteTab}
        className="px-0"
      />
      <div className="mt-3 space-y-1">
        {paletteTab === "fields"
          ? definition.fields.map((field) => (
              <button
                key={field.id}
                type="button"
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-primary/10"
                onClick={() => insertField(field.key)}
              >
                {field.label}
                <span className="block truncate font-mono text-[11px] text-muted">{field.key}</span>
              </button>
            ))
          : null}
        {paletteTab === "documents"
          ? (definition.documents || []).map((item) => (
              <div key={item.id} className="truncate rounded-md px-2 py-1.5 text-sm">
                {item.label}
              </div>
            ))
          : null}
        {paletteTab === "stages"
          ? (definition.stages || []).map((item) => (
              <div key={item.id} className="truncate rounded-md px-2 py-1.5 text-sm">
                {item.label}
              </div>
            ))
          : null}
        {paletteTab === "others" ? <p className="text-sm text-muted">Use THEN actions for notifications, assignment, and webhooks.</p> : null}
      </div>
    </div>
  );
}

function SummaryPanel({ current, summary, definition, sample, setSample, testResult, runTest, existing, onDelete }) {
  return (
    <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4">
      <h3 className="text-sm font-semibold">Rule summary</h3>
      <p className="mt-1 text-xs text-muted">
        Priority {current.priority} · {current.active === false ? "Inactive" : "Active"}
      </p>
      <div className="mt-3 space-y-2 break-words text-sm">
        <p className="font-medium">WHEN</p>
        {summary.when.map((line, index) => (
          <p key={index}>
            {line.joiner ? <span className="text-xs font-semibold text-muted"> {line.joiner} </span> : null}
            {line.text}
          </p>
        ))}
        <p className="pt-2 font-medium">THEN</p>
        {summary.then.length ? summary.then.map((line) => <p key={line}>✓ {line}</p>) : <p className="text-muted">No actions</p>}
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Test rule</h3>
        <div className="mt-2 space-y-2">
          {(definition.fields || []).slice(0, 12).map((field) => (
            <Input
              key={field.key}
              label={field.label}
              value={sample[field.key] ?? ""}
              onChange={(event) => setSample({ ...sample, [field.key]: event.target.value })}
            />
          ))}
          <Button onClick={runTest}>Run test</Button>
        </div>
        {testResult ? (
          <div className="mt-3 space-y-2 break-words">
            <Badge variant={testResult.matched ? "success" : "danger"}>
              {testResult.matched ? "Rule will be triggered" : "Rule will not trigger"}
            </Badge>
            {testResult.matched
              ? testResult.actions.map((item) => (
                  <p key={item.label} className="text-sm">
                    ✓ {item.label}
                  </p>
                ))
              : testResult.failedConditions.map((item) => (
                  <p key={item.field} className="text-sm text-muted">
                    {item.field} {item.operator} {formatValue(item.expected)} — actual {formatValue(item.actual)}
                  </p>
                ))}
          </div>
        ) : null}
      </div>
      {existing ? (
        <Button variant="danger" className="mt-6" onClick={onDelete}>
          Delete rule
        </Button>
      ) : null}
    </div>
  );
}

export function RuleBuilderWorkspace({ ruleId }) {
  const router = useRouter();
  const toast = useToast();
  const { form, definition, saveRule, removeRule, persist, loadError } = useFormBuilder();
  const existing = definition?.rules?.find((item) => item.id === ruleId);
  const [rule, setRule] = useState(null);
  const [paletteTab, setPaletteTab] = useState("fields");
  const [sample, setSample] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (!definition || rule) return;
    if (existing) setRule(existing);
    else if (ruleId === "new") setRule(createRule({ name: "New rule", when: createConditionGroup() }));
  }, [definition, existing, rule, ruleId]);

  if (loadError) return <Alert variant="danger">{loadError}</Alert>;
  if (!definition || !rule) return <Spinner label="Loading rule" />;

  const current = rule;
  const summary = summarizeRule(current, definition);

  function insertField(key) {
    setRule((prev) => {
      const next = prev || current;
      const when = next.when || createConditionGroup();
      return {
        ...next,
        when: { ...when, conditions: [...(when.conditions || []), { field: key, operator: "equals", value: "" }] },
      };
    });
    setPaletteOpen(false);
  }

  async function save() {
    saveRule(current);
    await persist();
    toast.success("Rule saved");
    if (ruleId === "new") router.replace(`${ROUTES.forms}/${form.id}/rules/${current.id}`);
  }

  function runTest() {
    setTestResult(evaluateRule(current, definition, sample));
  }

  async function onDelete() {
    removeRule(current.id);
    await persist();
    router.push(`${ROUTES.forms}/${form.id}`);
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-bg">
        <div className="flex min-w-0 shrink-0 flex-col gap-2 border-b border-border bg-surface px-3 py-2 sm:px-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">
              <Link href={ROUTES.forms}>Forms</Link> / <Link href={`${ROUTES.forms}/${form.id}`}>{definition.name}</Link> / Rule
            </p>
            <Input label="Rule name" value={current.name} onChange={(event) => setRule({ ...current, name: event.target.value })} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="w-24 shrink-0">
              <Input
                label="Priority"
                type="number"
                value={current.priority}
                onChange={(event) => setRule({ ...current, priority: Number(event.target.value) })}
              />
            </div>
            <Checkbox label="Active" checked={current.active !== false} onChange={(event) => setRule({ ...current, active: event.target.checked })} />
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setPaletteOpen(true)}>
              Fields
            </Button>
            <Button variant="outline" size="sm" className="xl:hidden" onClick={() => setSummaryOpen(true)}>
              Test
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`${ROUTES.forms}/${form.id}`)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save rule
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)_17.5rem]">
          <aside className="hidden min-h-0 min-w-0 overflow-hidden border-r border-border bg-slate-50 lg:block dark:bg-slate-900/40">
            <Palette definition={definition} paletteTab={paletteTab} setPaletteTab={setPaletteTab} insertField={insertField} />
          </aside>
          <div className="min-h-0 min-w-0 space-y-5 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
            <section className="min-w-0">
              <h2 className="mb-2 font-display text-lg font-semibold">When</h2>
              <ConditionTreeEditor group={current.when} fields={definition.fields} onChange={(when) => setRule({ ...current, when })} />
            </section>
            <section className="min-w-0">
              <h2 className="mb-2 font-display text-lg font-semibold">Then</h2>
              <ActionListEditor actions={current.then || []} definition={definition} onChange={(then) => setRule({ ...current, then })} />
            </section>
          </div>
          <aside className="hidden min-h-0 min-w-0 overflow-hidden border-l border-border xl:block">
            <SummaryPanel
              current={current}
              summary={summary}
              definition={definition}
              sample={sample}
              setSample={setSample}
              testResult={testResult}
              runTest={runTest}
              existing={existing}
              onDelete={onDelete}
            />
          </aside>
        </div>
      </div>
      <BuilderDrawer open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Fields & elements">
        <Palette definition={definition} paletteTab={paletteTab} setPaletteTab={setPaletteTab} insertField={insertField} />
      </BuilderDrawer>
      <BuilderDrawer open={summaryOpen} onClose={() => setSummaryOpen(false)} side="right" title="Rule summary">
        <SummaryPanel
          current={current}
          summary={summary}
          definition={definition}
          sample={sample}
          setSample={setSample}
          testResult={testResult}
          runTest={runTest}
          existing={existing}
          onDelete={onDelete}
        />
      </BuilderDrawer>
    </>
  );
}
