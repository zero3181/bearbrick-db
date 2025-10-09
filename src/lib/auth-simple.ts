// Simple password-based authentication

const ADMIN_PASSWORD = '4321'

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

export function isAdmin(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false

  const [type, credentials] = authHeader.split(' ')
  if (type !== 'Bearer') return false

  return credentials === ADMIN_PASSWORD
}
