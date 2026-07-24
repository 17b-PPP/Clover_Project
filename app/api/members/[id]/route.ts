import { NextRequest, NextResponse } from "next/server";
import { getMember, setMemberStatus, updateMember } from "@/lib/data/members";
import type { MemberInput, MemberStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json(member);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as Partial<MemberInput> & {
    status?: MemberStatus;
  };

  if (body.status) {
    const updated = await setMemberStatus(id, body.status);
    if (!updated) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  const updated = await updateMember(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
