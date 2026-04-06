import { NextResponse } from "next/server";
import { deleteKnowledgeLibraryDocument } from "@/lib/server/services/knowledge-base-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const wasDeleted = await deleteKnowledgeLibraryDocument(id);

  if (!wasDeleted) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
