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

export const dynamic = "force-dynamic";

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
  const documents = await listKnowledgeLibraryDocuments();
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
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

  const document = await createKnowledgeLibraryDocument({
    name: file.name.trim(),
    category,
    pages: estimateKnowledgeDocumentPages(file),
    mimeType: file.type,
    sizeInBytes: file.size,
    fileBuffer: Buffer.from(await file.arrayBuffer()),
  });

  return NextResponse.json({ document }, { status: 201 });
}
