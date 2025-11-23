import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL!);

async function checkSchema() {
  try {
    const result = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Document'
      ORDER BY ordinal_position;
    `;

    console.log("Document table schema:");
    console.table(result);

    await client.end();
  } catch (error) {
    console.error("Error:", error);
    await client.end();
    process.exit(1);
  }
}

checkSchema();
