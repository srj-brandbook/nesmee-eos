"use client";

export function KanbanBoard({ columns, items, groupKey = "stage", onMove, renderCard }) {
  function onDragStart(event, item) {
    if (event.target.closest("a, button")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDrop(event, stage) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id && onMove) onMove(id, stage);
  }

  return (
    <div className="flex min-h-[28rem] gap-3 overflow-x-auto pb-2">
      {columns.map((column) => {
        const cards = items.filter((item) => item[groupKey] === column.value);
        return (
          <div
            key={column.value}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-bg"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, column.value)}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-medium">{column.label}</p>
              <span className="text-xs text-muted">{cards.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
              {cards.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(event) => onDragStart(event, item)}
                  className="cursor-grab rounded-md border border-border bg-surface p-3 shadow-sm active:cursor-grabbing"
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
