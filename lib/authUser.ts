const USER_EMAIL_COOKIE_KEY = "medibuddy_admin_email"

function parseCookieValue(key: string): string | null {
  if (typeof document === "undefined") return null

  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}=`))

  if (!cookie) return null

  const value = cookie.slice(key.length + 1)
  return value ? decodeURIComponent(value) : null
}

export function getLoggedInUserEmail(): string | null {
  return parseCookieValue(USER_EMAIL_COOKIE_KEY)
}

export function setLoggedInUserEmail(email: string) {
  if (typeof document === "undefined") return

  const safeEmail = encodeURIComponent(email.trim())
  if (!safeEmail) return

  document.cookie = `${USER_EMAIL_COOKIE_KEY}=${safeEmail}; Path=/; Max-Age=2592000; SameSite=Lax`
}

export function clearLoggedInUserEmail() {
  if (typeof document === "undefined") return

  document.cookie = `${USER_EMAIL_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}
