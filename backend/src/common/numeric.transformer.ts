/**
 * TypeORM stores `decimal`/`numeric` columns as strings to preserve precision.
 * This transformer converts them to JS numbers on read so money values behave
 * consistently across the API. Values are rounded to 2 dp (KES cents).
 */
export class NumericTransformer {
  to(value: number | null): number | null {
    return value === null || value === undefined ? value : value;
  }

  from(value: string | null): number | null {
    if (value === null || value === undefined) return null;
    return Math.round(parseFloat(value) * 100) / 100;
  }
}

export const numericTransformer = new NumericTransformer();
