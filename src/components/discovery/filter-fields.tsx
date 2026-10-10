import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Taxonomy } from "@/lib/data/taxonomy";
import { str, type RawParams } from "./params";

function Group({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Select({ id, name, value, options, any = "Any" }: { id: string; name: string; value?: string; options: { id: number | string; name: string }[]; any?: string }) {
  return (
    <NativeSelect id={id} name={name} defaultValue={value ?? ""}>
      <option value="">{any}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Plain GET form: filters live in the URL and are applied server-side. Works without JavaScript. */
export function CreatorFilterForm({ params, taxonomy, action, idPrefix, hidden = {} }: { params: RawParams; taxonomy: Taxonomy; action: string; idPrefix: string; hidden?: Record<string, string | undefined> }) {
  const styles = new Set((Array.isArray(params.style) ? params.style : params.style ? [params.style] : []).map(String));
  const id = (s: string) => `${idPrefix}-${s}`;
  return (
    <form method="get" action={action} className="grid gap-5" role="search" aria-label="Filter creators">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Group label="Keywords" htmlFor={id("q")}>
        <Input id={id("q")} name="q" defaultValue={str(params, "q")} placeholder="Name, skill, niche, portfolio…" />
      </Group>
      <Group label="Category" htmlFor={id("category")}>
        <Select id={id("category")} name="category" value={str(params, "category")} options={taxonomy.categories} />
      </Group>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">Creative style</legend>
        <div className="flex flex-wrap gap-1.5">
          {taxonomy.styles.map((s) => (
            <label
              key={s.id}
              className="cursor-pointer rounded-full border border-line bg-white px-2.5 py-1 text-xs has-[:checked]:border-forest has-[:checked]:bg-forest has-[:checked]:text-ivory has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input type="checkbox" name="style" value={s.id} defaultChecked={styles.has(String(s.id))} className="sr-only" />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Group label="Skill" htmlFor={id("skill")}>
        <Select id={id("skill")} name="skill" value={str(params, "skill")} options={taxonomy.skills} />
      </Group>
      <Group label="Platform" htmlFor={id("platform")}>
        <Select id={id("platform")} name="platform" value={str(params, "platform")} options={taxonomy.platforms} />
      </Group>
      <Group label="Availability" htmlFor={id("availability")}>
        <Select
          id={id("availability")}
          name="availability"
          value={str(params, "availability")}
          options={[
            { id: "available", name: "Available now" },
            { id: "limited", name: "Limited availability" },
          ]}
        />
      </Group>
      <Group label="Max starting rate (USD)" htmlFor={id("maxRate")}>
        <Input id={id("maxRate")} name="maxRate" inputMode="decimal" defaultValue={str(params, "maxRate")} placeholder="e.g. 1000" />
      </Group>
      <div className="grid grid-cols-2 gap-3">
        <Group label="Country" htmlFor={id("country")}>
          <Input id={id("country")} name="country" defaultValue={str(params, "country")} placeholder="e.g. India" />
        </Group>
        <Group label="Language" htmlFor={id("language")}>
          <Input id={id("language")} name="language" defaultValue={str(params, "language")} placeholder="e.g. English" />
        </Group>
      </div>
      <Group label="Sort by" htmlFor={id("sort")}>
        <NativeSelect id={id("sort")} name="sort" defaultValue={str(params, "sort") ?? "relevance"}>
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="rate_low">Starting rate: low to high</option>
          <option value="rate_high">Starting rate: high to low</option>
        </NativeSelect>
      </Group>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="ghost">
          <Link href={`${action}${hidden.campaign ? `?campaign=${hidden.campaign}` : ""}`}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}

export function CampaignFilterForm({ params, taxonomy, action, idPrefix }: { params: RawParams; taxonomy: Taxonomy; action: string; idPrefix: string }) {
  const id = (s: string) => `${idPrefix}-${s}`;
  return (
    <form method="get" action={action} className="grid gap-5" role="search" aria-label="Filter campaigns">
      <Group label="Keywords" htmlFor={id("q")}>
        <Input id={id("q")} name="q" defaultValue={str(params, "q")} placeholder="Product, brief, brand…" />
      </Group>
      <Group label="Creator category" htmlFor={id("category")}>
        <Select id={id("category")} name="category" value={str(params, "category")} options={taxonomy.categories} />
      </Group>
      <Group label="Platform" htmlFor={id("platform")}>
        <Select id={id("platform")} name="platform" value={str(params, "platform")} options={taxonomy.platforms} />
      </Group>
      <Group label="Deliverable" htmlFor={id("deliverable")}>
        <Select id={id("deliverable")} name="deliverable" value={str(params, "deliverable")} options={taxonomy.deliverableTypes} />
      </Group>
      <Group label="Budget at least (USD)" htmlFor={id("minBudget")}>
        <Input id={id("minBudget")} name="minBudget" inputMode="decimal" defaultValue={str(params, "minBudget")} placeholder="e.g. 500" />
      </Group>
      <Group label="Deadline before" htmlFor={id("deadlineBefore")}>
        <Input id={id("deadlineBefore")} name="deadlineBefore" type="date" defaultValue={str(params, "deadlineBefore")} />
      </Group>
      <Group label="Sort by" htmlFor={id("sort")}>
        <NativeSelect id={id("sort")} name="sort" defaultValue={str(params, "sort") ?? "newest"}>
          <option value="newest">Newest</option>
          <option value="relevance">Relevance</option>
          <option value="deadline">Deadline: soonest</option>
          <option value="budget">Budget: highest</option>
        </NativeSelect>
      </Group>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="ghost">
          <Link href={action}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}
