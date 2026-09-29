import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PdfExtractionResult = {
  text: string;
  passwordRequired: boolean;
};

export async function extractBcpPdfLayoutText(
  pdfBytes: Uint8Array,
  password: string
): Promise<PdfExtractionResult> {
  const directory = await mkdtemp(join(tmpdir(), "myksh-bcp-"));
  const inputPath = join(directory, "input.pdf");
  const decryptedPath = join(directory, "decrypted.pdf");
  const textPath = join(directory, "output.txt");

  try {
    await writeFile(inputPath, pdfBytes);

    let passwordRequired = true;

    try {
      await execFileAsync("qpdf", [
        `--password=${password}`,
        "--decrypt",
        inputPath,
        decryptedPath,
      ], { windowsHide: true, maxBuffer: 1024 * 1024 });
    } catch (error) {
      const value = error as { stderr?: string; message?: string };
      const detail = value.stderr || value.message || "";

      if (/password|invalid|user password/i.test(detail)) {
        throw new Error("PDF_PASSWORD_INVALID");
      }
      throw new Error(`QPDF_DECRYPT_FAILED: ${detail}`);
    }

    // qpdf puede descifrar y copiar también PDFs que no requieren contraseña.
    // En ambos casos el resultado es un PDF temporal legible.
    try {
      await execFileAsync("pdftotext", [
        "-layout",
        "-enc", "UTF-8",
        decryptedPath,
        textPath,
      ], { windowsHide: true, maxBuffer: 1024 * 1024 });
    } catch (error) {
      const value = error as { stderr?: string; code?: string; message?: string };
      if (value.code === "ENOENT") throw new Error("PDFTOTEXT_NOT_INSTALLED");
      throw new Error(`PDFTOTEXT_FAILED: ${value.stderr || value.message || ""}`);
    }

    const text = await readFile(textPath, "utf8");
    if (!text.trim()) throw new Error("PDF_EMPTY_TEXT");

    return { text, passwordRequired };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
