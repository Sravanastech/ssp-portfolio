import type { BlockData, BlockSchema } from "@/api/studioApi";
import Field, { type FormCtx } from "./Field";
import type { StudioModel } from "./useStudio";

export function useFormCtx(studio: StudioModel, key: string): FormCtx {
  return {
    idBase: key,
    errors: studio.errors[key] ?? {},
    setError: (path, message) => studio.setFieldError(key, path, message),
  };
}

/** Renders every property of a block schema with the generic field renderer. */
export default function BlockForm({
  studio,
  schema,
  blockKey,
  data,
}: {
  studio: StudioModel;
  schema: BlockSchema;
  blockKey: string;
  data: BlockData;
}) {
  const ctx = useFormCtx(studio, blockKey);
  return (
    <div className="studio-form">
      {Object.entries(schema.properties ?? {}).map(([k, sub]) => (
        <Field
          key={k}
          schema={sub}
          value={data[k]}
          onChange={(v) => studio.setData(blockKey, { ...data, [k]: v })}
          path={k}
          ctx={ctx}
          required={(schema.required ?? []).includes(k)}
        />
      ))}
    </div>
  );
}
