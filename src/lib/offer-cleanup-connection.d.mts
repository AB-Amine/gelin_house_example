export function cleanupConnection(): Promise<{
  query(
    sql: string,
  ): Promise<{
    rows: { result: { removed: number; retained: number; errors: number } }[];
  }>;
  end(): Promise<void>;
}>;
