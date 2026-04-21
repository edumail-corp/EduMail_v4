import { inflateRawSync, inflateSync } from "node:zlib";
import {
  buildKnowledgeDocumentPreview,
  buildKnowledgeDocumentSummary,
  type KnowledgeBaseCategory,
} from "@/lib/knowledge-base-data";

const maxGroundingTextLength = 12000;
const maxSummaryLength = 260;
const maxPreviewLength = 340;
const maxPassageLength = 360;

function clipAtWordBoundary(value: string, maxLength: number) {
  const normalizedValue = value.trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  const clippedValue = normalizedValue.slice(0, maxLength + 1);
  const lastSpaceIndex = clippedValue.lastIndexOf(" ");
  const safeIndex =
    lastSpaceIndex >= Math.floor(maxLength * 0.6) ? lastSpaceIndex : maxLength;

  return `${clippedValue.slice(0, safeIndex).trim()}...`;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitIntoSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
}

function buildFallbackGroundingText(
  name: string,
  category: KnowledgeBaseCategory,
  summary?: string,
  previewExcerpt?: string
) {
  const fallbackSummary =
    summary?.trim() || buildKnowledgeDocumentSummary(name, category);
  const fallbackPreview =
    previewExcerpt?.trim() || buildKnowledgeDocumentPreview(name, category);

  return normalizeExtractedText(
    `${fallbackSummary}\n\n${fallbackPreview}\n\nDocument category: ${category}.`
  );
}

function buildSummaryFromText(
  text: string,
  fallbackSummary: string
) {
  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    return fallbackSummary;
  }

  return clipAtWordBoundary(sentences.slice(0, 2).join(" "), maxSummaryLength);
}

function buildPreviewFromText(
  text: string,
  fallbackPreview: string
) {
  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    return fallbackPreview;
  }

  return clipAtWordBoundary(sentences[0] ?? fallbackPreview, maxPreviewLength);
}

function decodePdfStringToken(token: string) {
  let decoded = "";

  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];

    if (character !== "\\") {
      decoded += character;
      continue;
    }

    const nextCharacter = token[index + 1];

    if (!nextCharacter) {
      break;
    }

    if (/[0-7]/.test(nextCharacter)) {
      const octalSequence = token.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0];

      if (octalSequence) {
        decoded += String.fromCharCode(Number.parseInt(octalSequence, 8));
        index += octalSequence.length;
        continue;
      }
    }

    const escapedCharacters: Record<string, string> = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "\\": "\\",
      "(": "(",
      ")": ")",
    };

    decoded += escapedCharacters[nextCharacter] ?? nextCharacter;
    index += 1;
  }

  return decoded;
}

function isLikelyHumanText(value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length < 20) {
    return false;
  }

  const letterCount =
    normalizedValue.match(/[\p{L}\p{N}]/gu)?.length ?? 0;

  return letterCount >= Math.floor(normalizedValue.length * 0.45);
}

function extractPdfTextStrings(value: string) {
  const matches = value.match(/\((?:\\.|[^\\()])*\)/g) ?? [];

  return matches
    .map((match) => decodePdfStringToken(match.slice(1, -1)))
    .map((match) => normalizeExtractedText(match))
    .filter(isLikelyHumanText);
}

function extractPrintableText(value: string) {
  const matches =
    value.match(/[\p{L}\p{N}][\p{L}\p{N}\p{P}\p{Zs}\n]{24,}/gu) ?? [];

  return normalizeExtractedText(matches.join("\n"));
}

function extractPdfText(buffer: Buffer) {
  const pdfSource = buffer.toString("latin1");
  const collectedSegments: string[] = [];
  let searchIndex = 0;

  while (searchIndex < pdfSource.length) {
    const streamIndex = pdfSource.indexOf("stream", searchIndex);

    if (streamIndex === -1) {
      break;
    }

    let dataStart = streamIndex + "stream".length;

    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
      dataStart += 1;
    }

    const endStreamIndex = pdfSource.indexOf("endstream", dataStart);

    if (endStreamIndex === -1) {
      break;
    }

    const dictionarySegment = pdfSource.slice(
      Math.max(0, streamIndex - 256),
      streamIndex
    );
    const encodedStream = buffer.subarray(dataStart, endStreamIndex);
    let decodedStream = encodedStream;

    if (/FlateDecode/.test(dictionarySegment)) {
      try {
        decodedStream = inflateSync(encodedStream);
      } catch {
        try {
          decodedStream = inflateRawSync(encodedStream);
        } catch {
          decodedStream = encodedStream;
        }
      }
    }

    const extractedStrings = extractPdfTextStrings(
      decodedStream.toString("latin1")
    );

    if (extractedStrings.length > 0) {
      collectedSegments.push(extractedStrings.join(" "));
    }

    searchIndex = endStreamIndex + "endstream".length;
  }

  const normalizedSegments = normalizeExtractedText(collectedSegments.join("\n\n"));

  if (normalizedSegments.length > 0) {
    return normalizedSegments;
  }

  return extractPrintableText(pdfSource);
}

function findZipEndOfCentralDirectory(buffer: Buffer) {
  for (
    let index = buffer.length - 22;
    index >= Math.max(0, buffer.length - 65557);
    index -= 1
  ) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      return index;
    }
  }

  return -1;
}

function listZipEntries(buffer: Buffer) {
  const endOfCentralDirectoryIndex = findZipEndOfCentralDirectory(buffer);

  if (endOfCentralDirectoryIndex === -1) {
    return [] as Array<{ name: string; compressionMethod: number; data: Buffer }>;
  }

  const totalEntries = buffer.readUInt16LE(endOfCentralDirectoryIndex + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirectoryIndex + 16);
  const entries: Array<{ name: string; compressionMethod: number; data: Buffer }> = [];
  let cursor = centralDirectoryOffset;

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const fileCommentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.toString(
      "utf8",
      cursor + 46,
      cursor + 46 + fileNameLength
    );
    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    let data = compressedData;

    if (compressionMethod === 8) {
      data = inflateRawSync(compressedData);
    }

    entries.push({
      name: fileName,
      compressionMethod,
      data,
    });

    cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function extractDocxXmlText(value: string) {
  return normalizeExtractedText(
    decodeXmlEntities(
      value
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n\n")
        .replace(/<\/w:tr>/g, "\n")
        .replace(/<\/w:tc>/g, "\t")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function extractDocxText(buffer: Buffer) {
  const relevantEntryPrefixes = new Set([
    "word/document.xml",
    "word/footnotes.xml",
    "word/endnotes.xml",
  ]);
  const zipEntries = listZipEntries(buffer);
  const xmlSegments = zipEntries
    .filter((entry) => {
      if (relevantEntryPrefixes.has(entry.name)) {
        return true;
      }

      return /^word\/(header|footer)\d+\.xml$/.test(entry.name);
    })
    .map((entry) => extractDocxXmlText(entry.data.toString("utf8")))
    .filter((segment) => segment.length > 0);

  return normalizeExtractedText(xmlSegments.join("\n\n"));
}

function extractDocumentText(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
) {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  const normalizedName = fileName.trim().toLowerCase();

  try {
    if (
      normalizedMimeType === "application/pdf" ||
      normalizedName.endsWith(".pdf")
    ) {
      return extractPdfText(fileBuffer);
    }

    if (
      normalizedMimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalizedName.endsWith(".docx")
    ) {
      return extractDocxText(fileBuffer);
    }
  } catch (error) {
    console.error("Failed to extract knowledge-document text.", error);
  }

  return "";
}

export function deriveKnowledgeDocumentGrounding(input: {
  name: string;
  category: KnowledgeBaseCategory;
  mimeType: string;
  fileBuffer: Buffer;
}) {
  const fallbackSummary = buildKnowledgeDocumentSummary(
    input.name,
    input.category
  );
  const fallbackPreview = buildKnowledgeDocumentPreview(
    input.name,
    input.category
  );
  const extractedText = extractDocumentText(
    input.fileBuffer,
    input.mimeType,
    input.name
  );
  const normalizedText = normalizeExtractedText(extractedText);
  const groundingText =
    normalizedText.length > 0
      ? clipAtWordBoundary(normalizedText, maxGroundingTextLength)
      : buildFallbackGroundingText(
          input.name,
          input.category,
          fallbackSummary,
          fallbackPreview
        );

  return {
    summary: buildSummaryFromText(groundingText, fallbackSummary),
    previewExcerpt: buildPreviewFromText(groundingText, fallbackPreview),
    groundingText,
  };
}

export function buildGroundingPassages(text: string) {
  const normalizedText = normalizeExtractedText(text);

  if (normalizedText.length === 0) {
    return [] as string[];
  }

  const paragraphs = normalizedText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 40);
  const passages: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxPassageLength) {
      passages.push(paragraph);
      continue;
    }

    const sentences = splitIntoSentences(paragraph);

    if (sentences.length === 0) {
      passages.push(clipAtWordBoundary(paragraph, maxPassageLength));
      continue;
    }

    let currentPassage = "";

    for (const sentence of sentences) {
      const nextPassage = currentPassage
        ? `${currentPassage} ${sentence}`
        : sentence;

      if (nextPassage.length > maxPassageLength && currentPassage.length > 0) {
        passages.push(currentPassage);
        currentPassage = sentence;
      } else {
        currentPassage = nextPassage;
      }
    }

    if (currentPassage.length > 0) {
      passages.push(currentPassage);
    }
  }

  return [...new Set(passages.map((passage) => passage.trim()).filter(Boolean))];
}

export function getKnowledgeDocumentGroundingText(input: {
  name: string;
  category: KnowledgeBaseCategory;
  summary: string;
  previewExcerpt: string;
  groundingText?: string;
}) {
  return (
    input.groundingText?.trim() ||
    buildFallbackGroundingText(
      input.name,
      input.category,
      input.summary,
      input.previewExcerpt
    )
  );
}
