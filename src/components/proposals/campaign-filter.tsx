"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

/** A select that navigates by setting one query parameter. */
export function NativeSelectNav({
  label,
  value,
  options,
  base,
  param,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  base: string;
  param: string;
}) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(e) => {
        const url = new URL(base, "http://x");
        if (e.target.value) url.searchParams.set(param, e.target.value);
        else url.searchParams.delete(param);
        router.push(`${url.pathname}${url.search}`);
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
