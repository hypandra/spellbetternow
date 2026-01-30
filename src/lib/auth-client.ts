import { createAuthClient } from "better-auth/react"

// Use window.location.origin in browser for dynamic port support
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { useSession, signIn, signOut, signUp } = authClient
