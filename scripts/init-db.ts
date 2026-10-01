import { initDatabase, getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'

async function main() {
  console.log('Initializing database...')

  await initDatabase()

  const db = await getDb()

  // Create demo tenant if not exists
  let tenant = await db.get('SELECT * FROM tenants WHERE slug = ?', 'demo')

  if (!tenant) {
    const tenantId = generateId()
    await db.run(`
      INSERT INTO tenants (id, name, slug, status, currency, country, timezone)
      VALUES (?, ?, 'demo', 'active', 'INR', 'IN', 'Asia/Kolkata')
    `, tenantId, 'Demo Tenant')
    
    tenant = { id: tenantId, slug: 'demo' }
    console.log('Created demo tenant:', tenantId)
  } else {
    console.log('Demo tenant already exists:', tenant.id)
  }

  // Create pricing_config table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_config (
      tenant_id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
    
    CREATE TABLE IF NOT EXISTS repair_status_history (
      id TEXT PRIMARY KEY,
      repair_request_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_repair_status_history ON repair_status_history(repair_request_id);
  `)

  console.log('Database initialization complete!')
  console.log('Tenant ID:', tenant.id)
}

main().catch(console.error)