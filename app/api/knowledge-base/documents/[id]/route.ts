import { NextResponse } from "next/server";
import { deleteKnowledgeLibraryDocument } from "@/lib/server/services/knowledge-base-service";
import { requireWorkspaceUserForApi } from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildKnowledgeBaseFailureResponse(
  error: unknown,
  message: string
) {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    const wasDeleted = await deleteKnowledgeLibraryDocument(id);

    if (!wasDeleted) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return buildKnowledgeBaseFailureResponse(
      error,
      "Unable to delete the document right now."
    );
  }
}
