# Components

All primitives live in `frontend/components/ui`.

Button, Input, Select, Textarea, Checkbox, Radio, Card, Badge, Modal, Drawer, Dropdown, Table, Tabs, Tooltip, Avatar, Toast, Alert, Pagination, Skeleton, Spinner, EmptyState, ConfirmationDialog, Chart, Accordion, Can.

## Rules

- Variants via props (`variant`, `size`)
- Forms use Input/Select plus field-level `error`
- Tables compose Table + Pagination + EmptyState
- Feature widgets (`components/users`, `components/roles`) may call services; primitives never do
