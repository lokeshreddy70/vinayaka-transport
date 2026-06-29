export function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('can\'t reach database server') ||
    message.includes('can not reach database server') ||
    message.includes('localhost:5432') ||
    message.includes('prisma')
  )
}
