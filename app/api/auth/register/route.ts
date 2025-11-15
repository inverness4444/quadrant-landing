import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/services/auth/authService";
import { setSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  companyName: z.string().min(2),
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const { userId } = await registerUser(parsed.data);
    await setSession(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "EMAIL_TAKEN") {
      return NextResponse.json({ ok: false, message: "Email уже занят" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: "Не удалось создать аккаунт" }, { status: 500 });
  }
}
