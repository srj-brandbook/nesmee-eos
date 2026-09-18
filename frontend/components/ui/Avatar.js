import { initials } from "@/lib/utils";

export function Avatar({ name, src, size = 36 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}
