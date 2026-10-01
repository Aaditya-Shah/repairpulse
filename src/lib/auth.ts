import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getDb } from './database'
import { generateId } from './utils'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'repairpulse-dev-secret-key-min-32-chars-long'
)

export interface SessionPayload {
  userId: string
  email: string
  role: string
  tenantId: string
  displayName: string
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('rp_session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function requireRole(...allowedRoles: string[]): Promise<SessionPayload> {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  role: string,
  tenantId: string,
  phone?: string
): Promise<string> {
  const db = getDb()
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 12)
  const userId = generateId()

  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, role, tenant_id, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email, passwordHash, displayName, role, tenantId, phone || null)

  return userId
}

export async function verifyPassword(email: string, password: string): Promise<SessionPayload | null> {
  const db = getDb()
  const bcrypt = await import('bcryptjs')
  
  const user = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `).get(email)

  if (!user) return null

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return null

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
    displayName: user.display_name,
  }
}

export async function getUserById(userId: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
}

export async function getUsersByTenant(tenantId: string, role?: string) {
  const db = getDb()
  if (role) {
    return db.prepare('SELECT * FROM users WHERE tenant_id = ? AND role = ?').all(tenantId, role)
  }
  return db.prepare('SELECT * FROM users WHERE tenant_id = ?').all(tenantId)
}

export function setSessionCookie(token: string) {
  cookies().set('rp_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export function clearSessionCookie() {
  cookies().delete('rp_session')
}