import { NextRequest, NextResponse } from "next/server";
import { validateUser } from "@/services/auth/authService";
import { setSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await validateUser(parsed.data.email, parsed.data.password);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Неверный email или пароль" }, { status: 401 });
  }

  await setSession(result.user.id);
  return NextResponse.json({ ok: true });
}
