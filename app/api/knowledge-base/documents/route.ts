import { NextResponse } from "next/server";
import {
  estimateKnowledgeDocumentPages,
  isAcceptedKnowledgeFile,
  isKnowledgeBaseCategory,
} from "@/lib/knowledge-base-data";
import {
  createKnowledgeLibraryDocument,
  listKnowledgeLibraryDocuments,
} from "@/lib/server/services/knowledge-base-service";
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

function isKnowledgeUploadFile(value: FormDataEntryValue | null): value is File {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.arrayBuffer !== "function" ||
    typeof value.name !== "string" ||
    typeof value.type !== "string" ||
    typeof value.size !== "number"
  ) {
    return false;
  }

  return true;
}

export async function GET() {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const documents = await listKnowledgeLibraryDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return buildKnowledgeBaseFailureResponse(
      error,
      "Unable to load the document library right now."
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { error: "Invalid document upload request." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const category = formData.get("category");

  if (!isKnowledgeUploadFile(file)) {
    return NextResponse.json(
      { error: "Attach a PDF or DOCX file before uploading." },
      { status: 400 }
    );
  }

  if (typeof category !== "string" || !isKnowledgeBaseCategory(category)) {
    return NextResponse.json(
      { error: "Choose a valid category before uploading." },
      { status: 400 }
    );
  }

  if (!isAcceptedKnowledgeFile(file)) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported." },
      { status: 400 }
    );
  }

  try {
    const document = await createKnowledgeLibraryDocument({
      name: file.name.trim(),
      category,
      pages: estimateKnowledgeDocumentPages(file),
      mimeType: file.type,
      sizeInBytes: file.size,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return buildKnowledgeBaseFailureResponse(
      error,
      "Unable to save the document right now. The file was not added."
    );
  }
}
