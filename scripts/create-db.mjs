import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://postgres:786786@localhost:5432/postgres",
});

await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'noorix'");
if (!result.rowCount) {
  await client.query("CREATE DATABASE noorix");
  console.log("created database noorix");
} else {
  console.log("database noorix already exists");
}
await client.end();
