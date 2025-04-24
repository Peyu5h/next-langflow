import React, { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import Tesseract from "tesseract.js";

interface FileTextExtractorProps {
  setExtractedText: (text: string) => void;
  label: string;
}

const FileTextExtractor: React.FC<FileTextExtractorProps> = ({
  setExtractedText,
  label,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [isExtracted, setIsExtracted] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      setPdfjs(pdfjsLib);
    };
    script.onerror = () => {
      setError("Failed to load PDF reader. Please try again later.");
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const performOcr = async (file: File | string): Promise<string> => {
    const { data } = await Tesseract.recognize(file, "eng");
    return data.text;
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!pdfjs) {
      throw new Error("PDF.js is not loaded yet");
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    const numPages = pdf.numPages;

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");

      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    return fullText;
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromXLSX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_txt(worksheet);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      file.type !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      setError("Please select a PDF, DOCX, or XLSX file.");
      return;
    }

    setIsExtracting(true);
    setIsExtracted(true);
    setError(null);

    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setExtractedText(text);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const text = await extractTextFromDOCX(file);
        setExtractedText(text);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const text = await extractTextFromXLSX(file);
        setExtractedText(text);
      }
    } catch (error) {
      console.error("Error extracting text:", error);
      setError(
        `Failed to extract text from the file: ${(error as Error).message}`,
      );
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label>{label}</label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf, .docx, .xlsx"
        className="hidden"
      />
      <Button
        className="w-48"
        onClick={() => fileInputRef.current?.click()}
        disabled={isExtracting || !pdfjs || isExtracted}
      >
        {isExtracting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Extracting Text...
          </>
        ) : !pdfjs ? (
          "Loading PDF Reader..."
        ) : (
          "Select document"
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FileTextExtractor;
