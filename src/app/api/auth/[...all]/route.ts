import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { cookies } from "next/headers"
import { AGE_GATE_COOKIE_NAME, isAge13Plus } from "@/lib/age-gate"
import { NextResponse } from "next/server"

const handlers = toNextJsHandler(auth)

export const GET = handlers.GET
export async function POST(request: Request) {
  const cookieStore = await cookies()
  const isEligible = isAge13Plus(cookieStore.get(AGE_GATE_COOKIE_NAME)?.value)
  if (!isEligible) {
    return NextResponse.json(
      { error: 'Age gate required: account access is only available for users 13+.' },
      { status: 403 }
    )
  }
  return handlers.POST(request)
}
