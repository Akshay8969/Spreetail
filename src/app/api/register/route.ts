import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if person already exists (imported from CSV)
    const existingPerson = await prisma.person.findUnique({
      where: { name }
    });

    if (existingPerson) {
      if (existingPerson.email) {
        return NextResponse.json({ error: "This name has already been claimed by another email." }, { status: 400 });
      }

      // Check if email is in use by someone else
      const existingEmail = await prisma.person.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: "Email already in use." }, { status: 400 });
      }

      // Claim the account
      const updated = await prisma.person.update({
        where: { name },
        data: { email, passwordHash }
      });
      return NextResponse.json({ success: true, person: updated });
    }

    // Creating a completely new person
    const existingEmail = await prisma.person.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use." }, { status: 400 });
    }

    const newPerson = await prisma.person.create({
      data: {
        name,
        displayName: name,
        email,
        passwordHash
      }
    });

    return NextResponse.json({ success: true, person: newPerson });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", detail: String(err) }, { status: 500 });
  }
}
