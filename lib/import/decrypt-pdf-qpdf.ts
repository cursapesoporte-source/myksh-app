import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Descifra un PDF con contraseña y devuelve un buffer temporal sin cifrado.
 * La contraseña solo existe durante esta llamada.
 * Requiere qpdf instalado y accesible desde PATH.
 */
export async function decryptPdfWithQpdf(
  encryptedPdf: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const directory = await mkdtemp(join(tmpdir(), "myksh-pdf-"));
  const inputPath = join(directory, "input.pdf");
  const outputPath = join(directory, "output.pdf");

  try {
    await writeFile(inputPath, encryptedPdf);

    await execFileAsync("qpdf", [
      `--password=${password}`,
      "--decrypt",
      inputPath,
      outputPath,
    ], {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });

    return new Uint8Array(await readFile(outputPath));
  } catch (error) {
    const value = error as { stderr?: string; code?: string | number; message?: string };
    const detail = value.stderr || value.message || "qpdf no pudo descifrar el PDF.";

    if (/password|encrypt|invalid|user password/i.test(detail)) {
      throw new Error("PDF_PASSWORD_INVALID");
    }
    if (value.code === "ENOENT") {
      throw new Error("QPDF_NOT_INSTALLED");
    }
    throw new Error(`QPDF_DECRYPT_FAILED: ${detail}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
