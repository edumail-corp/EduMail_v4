"use client";

import {
  Suspense,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardIcon,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  acceptedKnowledgeFileExtensions,
  createKnowledgeDocumentDraft,
  defaultKnowledgeCategorySelection,
  filterKnowledgeDocuments,
  getKnowledgeDocumentOriginLabel,
  getKnowledgeDocumentStorageProviderLabel,
  isAcceptedKnowledgeFile,
  isKnowledgeCategorySelection,
  knowledgeBaseCategoryClasses,
  knowledgeBaseCategoryOptions,
  knowledgeBaseFilters,
  type KnowledgeBaseFilter,
  type KnowledgeCategorySelectValue,
  type KnowledgeDocument,
  type KnowledgeDocumentDraft,
} from "@/lib/knowledge-base-data";

type KnowledgeBaseDocumentsResponse = {
  documents: KnowledgeDocument[];
};

type KnowledgeBaseCreateResponse = {
  document: KnowledgeDocument;
};

type KnowledgeBaseErrorResponse = {
  error?: string;
};

function getKnowledgeBaseErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const error = data.error;

    if (typeof error === "string" && error.length > 0) {
      return error;
    }
  }

  return null;
}

function matchesKnowledgeDocumentSearch(
  document: KnowledgeDocument,
  query: string
) {
  if (query.length === 0) {
    return true;
  }

  const searchableText = [
    document.name,
    document.category,
    document.mimeType ?? "",
    document.uploadedAt,
    document.summary,
    document.previewExcerpt,
    ...(document.relatedCases?.flatMap((caseItem) => [
      caseItem.subject,
      caseItem.department,
      caseItem.approvalState,
      caseItem.citationReason,
      caseItem.citationExcerpt,
      caseItem.assignee ?? "",
    ]) ?? []),
    ...(document.supportHighlights?.flatMap((highlight) => [
      highlight.caseSubject,
      highlight.reason,
      highlight.excerpt,
    ]) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function KnowledgeBasePageContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<KnowledgeCategorySelectValue>(defaultKnowledgeCategorySelection);
  const [activeFilter, setActiveFilter] = useState<KnowledgeBaseFilter>("All");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [draftFile, setDraftFile] = useState<KnowledgeDocumentDraft | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documentQuery, setDocumentQuery] = useState("");

  const requestedDocumentQuery = searchParams.get("document") ?? "";
  const requestedReasonQuery = searchParams.get("reason") ?? "";
  const normalizedRequestedDocumentQuery =
    requestedDocumentQuery.trim().toLowerCase();
  const deferredDocumentQuery = useDeferredValue(documentQuery);
  const normalizedDocumentQuery = deferredDocumentQuery.trim().toLowerCase();
  const visibleDocs = filterKnowledgeDocuments(documents, activeFilter).filter(
    (document) =>
      matchesKnowledgeDocumentSearch(document, normalizedDocumentQuery)
  );
  const referencedDocumentCount = documents.filter(
    (document) => document.referenceCount > 0
  ).length;
  const coveredCategoryCount = new Set(
    documents.map((document) => document.category)
  ).size;

  const canUpload =
    draftFile !== null &&
    isKnowledgeCategorySelection(selectedCategory) &&
    !isSavingDocument;

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    setDocumentQuery(requestedDocumentQuery);
    if (requestedDocumentQuery.length > 0) {
      setActiveFilter("All");
    }
  }, [requestedDocumentQuery]);

  useEffect(() => {
    if (normalizedRequestedDocumentQuery.length === 0 || isLoadingDocuments) {
      return;
    }

    const highlightedDocument = document.querySelector<HTMLElement>(
      '[data-requested-document="true"]'
    );

    highlightedDocument?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [isLoadingDocuments, normalizedRequestedDocumentQuery, visibleDocs]);

  async function loadDocuments() {
    setIsLoadingDocuments(true);
    setLibraryError(null);

    try {
      const response = await fetch("/api/knowledge-base/documents", {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | KnowledgeBaseDocumentsResponse
        | KnowledgeBaseErrorResponse;

      if (!response.ok || !("documents" in data)) {
        throw new Error(
          getKnowledgeBaseErrorMessage(data) ??
            "Unable to load the document library."
        );
      }

      setDocuments(data.documents);
    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : "Unable to load the document library."
      );
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  const stageFile = (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadMessage(null);

    if (!isAcceptedKnowledgeFile(file)) {
      setDraftFile(null);
      setUploadError("Only PDF and DOCX files are supported right now.");
      return;
    }

    setDraftFile(createKnowledgeDocumentDraft(file));
    setUploadError(null);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    stageFile(event.dataTransfer.files[0] ?? null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    stageFile(event.target.files?.[0] ?? null);
  };

  const handleDelete = (id: string) => {
    void deleteDocument(id);
  };

  const handleUpload = () => {
    void uploadDocument();
  };

  async function uploadDocument() {
    if (!draftFile) {
      setUploadError("Select a file before adding it to the library.");
      return;
    }

    if (!isKnowledgeCategorySelection(selectedCategory)) {
      setUploadError("Choose a category before adding the document.");
      return;
    }

    setIsSavingDocument(true);
    setUploadError(null);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", draftFile.file);
      formData.append("category", selectedCategory);

      const response = await fetch("/api/knowledge-base/documents", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as
        | KnowledgeBaseCreateResponse
        | KnowledgeBaseErrorResponse;

      if (!response.ok || !("document" in data)) {
        throw new Error(
          getKnowledgeBaseErrorMessage(data) ?? "Unable to add the document."
        );
      }

      setDocuments((prev) => [data.document, ...prev]);
      setDraftFile(null);
      setSelectedCategory(defaultKnowledgeCategorySelection);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadMessage(`${data.document.name} was added to the library.`);
      setActiveFilter("All");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to add the document."
      );
    } finally {
      setIsSavingDocument(false);
    }
  }

  async function deleteDocument(id: string) {
    setDeletingId(id);
    setLibraryError(null);

    try {
      const response = await fetch(`/api/knowledge-base/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | KnowledgeBaseErrorResponse
          | null;
        throw new Error(data?.error ?? "Unable to delete the document.");
      }

      setDocuments((prev) => prev.filter((document) => document.id !== id));
      setUploadMessage("Document removed from the library.");
    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : "Unable to delete the document."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const handleClearDraft = () => {
    setDraftFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <DashboardTopBar
        searchValue={documentQuery}
        onSearchChange={setDocumentQuery}
        searchPlaceholder="Search policies, calendars, or case references..."
      />

      <DashboardPageHeader
        eyebrow="Reference Library"
        title="Knowledge Base"
        description="Keep source documents organized so the drafting workflow can cite the right policy, calendar, and operational guidance."
        meta={
          isLoadingDocuments
            ? "Loading library..."
            : `${documents.length} core references • ${referencedDocumentCount} cited in inbox • ${coveredCategoryCount} domains covered`
        }
      />

      <section className="space-y-4">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Add knowledge
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                Add source document
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Bring in policy, calendar, or process documents so replies can cite the right institutional guidance later.
              </p>
            </div>
            <span className="rounded-full border border-white/80 bg-white/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5C61FF] shadow-[0_14px_36px_rgba(141,153,179,0.14)]">
              {documents.length} library entries
            </span>
          </div>

          <label
            htmlFor="kb-upload-input"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[34px] border-2 border-dashed px-6 py-16 text-center transition ${
              isDragging
                ? "border-[#5C61FF] bg-[#F5F6FF]"
                : "border-white/80 bg-white/54"
            }`}
          >
            <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-white/82 text-[#5C61FF] shadow-[0_18px_44px_rgba(141,153,179,0.18)]">
              <DashboardIcon name="upload" className="h-9 w-9" />
            </span>
            <p className="mt-7 text-3xl font-semibold tracking-tight text-[#1E2340]">
              Upload Document
            </p>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">
              Drag and drop PDF or DOCX files to add them to the shared reference library.
            </p>
            <span className={`${dashboardSecondaryButtonClassName} mt-6`}>
              Select Files
            </span>
          </label>
          <input
            id="kb-upload-input"
            ref={fileInputRef}
            type="file"
            accept={acceptedKnowledgeFileExtensions.join(",")}
            onChange={handleFileChange}
            className="sr-only"
          />

          {draftFile ? (
            <div className="mt-5 rounded-[28px] border border-[#DCE1FF] bg-[#F6F7FF] p-5 shadow-[0_16px_36px_rgba(141,153,179,0.14)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Selected document
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {draftFile.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {draftFile.mimeTypeLabel} • {draftFile.sizeLabel} • Approx.{" "}
                    {draftFile.estimatedPages} pages
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearDraft}
                  className={dashboardGhostButtonClassName}
                >
                  Remove
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="kb-category"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                  >
                    Category
                  </label>
                  <select
                    id="kb-category"
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(
                        event.target.value as KnowledgeCategorySelectValue
                      )
                    }
                    className="rounded-full border border-white/80 bg-white/86 px-4 py-3 text-sm text-slate-700 shadow-[0_12px_30px_rgba(141,153,179,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                  >
                    <option>{defaultKnowledgeCategorySelection}</option>
                    {knowledgeBaseCategoryOptions.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className={
                    canUpload
                      ? dashboardPrimaryButtonClassName
                      : "inline-flex items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
                  }
                >
                  {isSavingDocument ? "Saving..." : "Add to Library"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-white/75 bg-white/54 px-4 py-4 text-sm text-slate-500">
              No document selected yet. Choose a file or drop one into the intake area.
            </div>
          )}

          {uploadError ? (
            <p className="mt-4 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C]">
              {uploadError}
            </p>
          ) : null}

          {uploadMessage ? (
            <p className="mt-4 rounded-[24px] border border-[#C7F0D6] bg-[#F0FBF4] px-4 py-3 text-sm text-[#19754C]">
              {uploadMessage}
            </p>
          ) : null}
        </article>

        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-[#1E2340]">
                Document Library
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Browse core policies, calendars, and process documents supporting current replies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDocumentQuery("")}
              disabled={documentQuery.length === 0}
              className={
                documentQuery.length > 0
                  ? dashboardGhostButtonClassName
                  : "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
              }
            >
              Clear Search
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/75 bg-white/62 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Library entries
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {documents.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/75 bg-white/62 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Case-linked references
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {referencedDocumentCount}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/75 bg-white/62 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Coverage areas
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {coveredCategoryCount}
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {knowledgeBaseFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? "bg-[#5C61FF] text-white shadow-[0_16px_34px_rgba(92,97,255,0.24)]"
                    : "border border-white/80 bg-white/70 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <p className="mb-5 text-sm text-slate-500">
            {normalizedDocumentQuery.length > 0
              ? `${visibleDocs.length} documents match the current search.`
              : `${visibleDocs.length} documents shown for the selected filter.`}
          </p>

          {normalizedRequestedDocumentQuery.length > 0 ? (
            <div className="mb-5 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] px-4 py-3 text-sm text-[#4F57E8]">
              <p>Opened from a source citation. Matching documents are highlighted below.</p>
              {requestedReasonQuery.length > 0 ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2E5FA3]">
                  Why this document matters: {requestedReasonQuery}
                </p>
              ) : null}
            </div>
          ) : null}

          {libraryError ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C]">
              <p>{libraryError}</p>
              <button
                type="button"
                onClick={() => void loadDocuments()}
                className={dashboardSecondaryButtonClassName}
              >
                Retry
              </button>
            </div>
          ) : null}

          {isLoadingDocuments ? (
            <div className="rounded-[24px] border border-white/75 bg-white/54 px-6 py-12 text-center text-sm text-slate-500">
              Loading documents...
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/75 bg-white/54 px-6 py-12 text-center text-sm text-slate-500">
              {normalizedDocumentQuery.length > 0
                ? "No documents match the current search."
                : "No documents found for the selected filter."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDocs.map((doc) => {
                const isRequestedDocument =
                  normalizedRequestedDocumentQuery.length > 0 &&
                  doc.name.toLowerCase().includes(normalizedRequestedDocumentQuery);

                return (
                  <div
                    key={doc.id}
                    data-requested-document={isRequestedDocument ? "true" : undefined}
                    className={`rounded-[30px] border p-5 shadow-[0_18px_44px_rgba(141,153,179,0.14)] transition ${
                      isRequestedDocument
                        ? "border-[#C7CEFF] bg-[#F7F8FF]"
                        : "border-white/75 bg-white/68"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-white/88 text-[#5C61FF] shadow-[0_12px_28px_rgba(141,153,179,0.14)]">
                        <DashboardIcon name="document" className="h-7 w-7" />
                      </span>
                      <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_rgba(141,153,179,0.12)]">
                        {getKnowledgeDocumentOriginLabel(doc.origin)}
                      </span>
                    </div>

                    <p className="mt-5 text-2xl font-semibold tracking-tight text-[#1E2340]">
                      {doc.name}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      {doc.summary}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${knowledgeBaseCategoryClasses[doc.category]}`}
                      >
                        {doc.category}
                      </span>
                    </div>

                    <div className="mt-5 text-sm leading-7 text-slate-500">
                      <p>{doc.uploadedAt}</p>
                      <p>{doc.pages} pages</p>
                    </div>

                    {doc.storageProvider && doc.storagePath ? (
                      <div className="mt-5 rounded-[22px] border border-[#DCE1FF] bg-[#F7F8FF] px-4 py-3 text-sm text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6673B0]">
                          Library status
                        </p>
                        <p className="mt-2 font-semibold text-[#1E2340]">
                          {getKnowledgeDocumentStorageProviderLabel(
                            doc.storageProvider
                          )}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Available for grounded drafting and document download.
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2">
                      {doc.downloadUrl ? (
                        <a
                          href={doc.downloadUrl}
                          className={dashboardSecondaryButtonClassName}
                        >
                          <span className="mr-2 inline-flex">
                            <DashboardIcon name="download" className="h-4 w-4" />
                          </span>
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                          Reference ready
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className={
                          deletingId === doc.id
                            ? "inline-flex items-center justify-center rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
                            : "inline-flex items-center justify-center rounded-full bg-[#FFE9EE] px-4 py-2.5 text-sm font-semibold text-[#D43D63] transition hover:bg-[#FFD9E2]"
                        }
                      >
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

      </section>
    </>
  );
}

function KnowledgeBasePageFallback() {
  return (
    <section className="space-y-4">
      <article className={`${dashboardPanelClassName} p-6`}>
        <div className="h-72 rounded-[34px] border border-white/80 bg-white/58" />
      </article>
      <article className={`${dashboardPanelClassName} p-6`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 rounded-[30px] border border-white/75 bg-white/62"
            />
          ))}
        </div>
      </article>
    </section>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<KnowledgeBasePageFallback />}>
      <KnowledgeBasePageContent />
    </Suspense>
  );
}
