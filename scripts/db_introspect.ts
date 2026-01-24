import { Client } from 'pg'

const connectionString = process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL in environment.')
  process.exit(1)
}

const fetchTables = async (client: Client): Promise<string[]> => {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  )
  return result.rows.map((row) => row.table_name as string)
}

const fetchColumns = async (client: Client, tableName: string) => {
  const result = await client.query(
    `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `,
    [tableName]
  )
  return result.rows
}

const run = async () => {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    const tables = await fetchTables(client)

    if (tables.length === 0) {
      console.log('No tables found in public schema.')
      return
    }

    console.log('Tables (public):')
    tables.forEach((table) => {
      console.log(`- ${table}`)
    })

    for (const table of tables) {
      const columns = await fetchColumns(client, table)
      console.log(`\n${table}`)
      columns.forEach((column) => {
        const nullable = column.is_nullable === 'YES' ? 'nullable' : 'not null'
        console.log(`  - ${column.column_name}: ${column.data_type} (${nullable})`)
      })
    }
  } catch (error) {
    console.error('Introspection failed:', (error as Error).message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

void run()
