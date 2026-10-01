import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const DATA_DIR = join(process.cwd(), 'data')
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

let dbInstance: Database | null = null

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await open({
      filename: join(DATA_DIR, 'repairpulse.db'),
      driver: sqlite3.Database,
    })
    
    await dbInstance.exec('PRAGMA foreign_keys = ON')
    await dbInstance.exec('PRAGMA journal_mode = WAL')
  }
  return dbInstance
}

export async function initDatabase(): Promise<void> {
  const db = await getDb()
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      currency TEXT DEFAULT 'INR',
      country TEXT DEFAULT 'IN',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'partner', 'admin')),
      tenant_id TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_number_hash TEXT,
      warranty_status TEXT,
      current_condition TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (customer_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices(customer_id);

    CREATE TABLE IF NOT EXISTS device_evidence (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      repair_request_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'document')),
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_device_evidence_device ON device_evidence(device_id);

    CREATE TABLE IF NOT EXISTS repair_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      reported_problem TEXT NOT NULL,
      normalized_problem TEXT,
      status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
        'REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW', 'CONFIRMED', 'REJECTED',
        'MANUAL_INSPECTION', 'PICKUP_PENDING', 'RECEIVED', 'DIAGNOSIS',
        'PARTS_PENDING', 'REPAIR', 'TESTING', 'READY', 'DELIVERY',
        'COMPLETED', 'CANCELLED'
      )),
      triage_status TEXT CHECK (triage_status IN ('LIKELY_SERVICEABLE', 'NEEDS_MANUAL_INSPECTION', 'LIKELY_UNSERVICEABLE')),
      ai_confidence REAL,
      estimated_minutes INTEGER,
      estimated_low INTEGER,
      estimated_high INTEGER,
      physical_inspection_required INTEGER DEFAULT 1,
      assigned_vendor_id TEXT,
      assigned_technician_id TEXT,
      actual_duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (assigned_vendor_id) REFERENCES users(id),
      FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_tenant ON repair_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_repair_customer ON repair_requests(customer_id);
    CREATE INDEX IF NOT EXISTS idx_repair_vendor ON repair_requests(assigned_vendor_id);
    CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_requests(status);

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      repair_request_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      previous_quote_id TEXT,
      change_reason TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'AI_ESTIMATE', 'VENDOR_CONFIRMED', 'CUSTOMER_APPROVED',
        'PAYMENT', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'
      )),
      ai_estimate_min INTEGER NOT NULL,
      ai_estimate_max INTEGER NOT NULL,
      vendor_estimate_min INTEGER,
      vendor_estimate_max INTEGER,
      final_amount INTEGER,
      currency TEXT DEFAULT 'INR',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id),
      FOREIGN KEY (previous_quote_id) REFERENCES quotes(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_repair ON quotes(repair_request_id);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED', 'PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED',
        'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
      )),
      stripe_payment_intent_id TEXT,
      stripe_client_secret TEXT,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (quote_id) REFERENCES quotes(id),
      FOREIGN KEY (customer_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_payments_quote ON payments(quote_id);

    CREATE TABLE IF NOT EXISTS pickup_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      repair_request_id TEXT NOT NULL,
      partner_id TEXT,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN (
        'AVAILABLE', 'ACCEPTED', 'ARRIVED', 'OTP_VERIFIED',
        'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'
      )),
      pickup_address TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      distance_km REAL,
      estimated_payout INTEGER,
      actual_payout INTEGER,
      otp_code TEXT,
      accepted_at DATETIME,
      picked_up_at DATETIME,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id),
      FOREIGN KEY (partner_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pickup_tenant ON pickup_jobs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_pickup_partner ON pickup_jobs(partner_id);
    CREATE INDEX IF NOT EXISTS idx_pickup_status ON pickup_jobs(status);

    CREATE TABLE IF NOT EXISTS model_versions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      version TEXT NOT NULL,
      dataset_version TEXT NOT NULL,
      benchmark_id TEXT NOT NULL,
      feature_schema_version TEXT NOT NULL,
      metrics TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'champion', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      promoted_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS benchmarks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      dataset_version TEXT NOT NULL,
      feature_schema_version TEXT NOT NULL,
      row_hash TEXT NOT NULL,
      eligibility_rule TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS drift_reports (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      reference_window_start DATETIME NOT NULL,
      reference_window_end DATETIME NOT NULL,
      current_window_start DATETIME NOT NULL,
      current_window_end DATETIME NOT NULL,
      device_category_psi REAL,
      device_family_psi REAL,
      new_device_proportion_shift REAL,
      repair_type_psi REAL,
      complexity_psi REAL,
      symptom_distribution_psi REAL,
      missingness_shift REAL,
      technician_mix_psi REAL,
      service_area_psi REAL,
      overall_drift_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS schedule_risks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      repair_request_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      predicted_finish DATETIME NOT NULL,
      next_window_start DATETIME NOT NULL,
      next_window_end DATETIME NOT NULL,
      breach_probability REAL NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      cause TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id),
      FOREIGN KEY (technician_id) REFERENCES users(id)
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

    CREATE TABLE IF NOT EXISTS pricing_config (
      tenant_id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
  `)

  console.log('Database initialized successfully')
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}