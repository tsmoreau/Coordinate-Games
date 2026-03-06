"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  RotateCcw,
  Trash2,
  Eye,
  Loader2,
  Download,
  Library,
  ChevronDown,
  ChevronRight,
  FileType,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedFnt {
  tracking: number;
  cellWidth: number;
  cellHeight: number;
  pngBase64: string | null;
  glyphs: { char: string; width: number }[];
  charSet: string[];
  kerning: Record<string, number>;
}

interface FontMeta {
  fontId: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

interface LoadedFont {
  id: string;
  name: string;
  parsed: ParsedFnt;
  atlasImage: HTMLImageElement | null;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseFnt(text: string): ParsedFnt {
  const lines = text.split("\n");
  let tracking = 0;
  let cellWidth = 0;
  let cellHeight = 0;
  let pngBase64: string | null = null;
  const glyphs: { char: string; width: number }[] = [];
  const kerning: Record<string, number> = {};

  let inHeader = true;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("--")) continue;

    if (inHeader) {
      if (line === "") {
        inHeader = false;
        continue;
      }
      const eq = line.indexOf("=");
      if (eq >= 0) {
        const key = line.substring(0, eq).trim();
        const val = line.substring(eq + 1).trim();
        if (key === "tracking") tracking = parseInt(val) || 0;
        else if (key === "width") cellWidth = parseInt(val) || 0;
        else if (key === "height") cellHeight = parseInt(val) || 0;
        else if (key === "data") pngBase64 = val;
      }
      continue;
    }

    if (line === "") continue;

    const tab = line.indexOf("\t");
    if (tab < 0) continue;

    const key = line.substring(0, tab);
    const val = parseInt(line.substring(tab + 1)) || 0;

    if (key === "space") {
      glyphs.push({ char: " ", width: val });
    } else {
      const chars = Array.from(key);
      if (chars.length === 1) {
        glyphs.push({ char: chars[0], width: val });
      } else if (chars.length === 2) {
        kerning[key] = val;
      }
    }
  }

  const charSet = glyphs.map((g) => g.char);
  return {
    tracking,
    cellWidth,
    cellHeight,
    pngBase64,
    glyphs,
    charSet,
    kerning,
  };
}

function stripExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadAtlasImage(pngBase64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode atlas PNG"));
    img.src = `data:image/png;base64,${pngBase64}`;
  });
}

// ─── Preview Row ─────────────────────────────────────────────────────────────

function FontPreviewRow({
  font,
  sampleText,
  displayScale,
  onRemove,
}: {
  font: LoadedFont;
  sampleText: string;
  displayScale: number;
  onRemove: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const { parsed, atlasImage } = font;
    if (!canvas || !atlasImage) return;

    const { charSet, glyphs, tracking, kerning, cellWidth, cellHeight } =
      parsed;
    const numCellsX = Math.ceil(Math.sqrt(charSet.length));
    const chars = Array.from(sampleText);

    // Compute positions — same walk as pdfontconv renderSampleText
    const positions: { drawX: number; charIdx: number }[] = [];
    let x = 0;
    let prevChar = "";

    for (const char of chars) {
      const idx = charSet.indexOf(char);
      if (idx < 0) continue;

      if (prevChar) {
        const pair = prevChar + char;
        if (pair in kerning) {
          x += kerning[pair];
        }
      }

      positions.push({ drawX: x, charIdx: idx });
      x += glyphs[idx].width + tracking;
      prevChar = char;
    }

    if (positions.length === 0) {
      canvas.width = 1;
      canvas.height = cellHeight || 1;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 1, 1);
      return;
    }

    const minX = Math.min(0, ...positions.map((p) => p.drawX));
    const shift = minX < 0 ? -minX : 0;
    const lastPos = positions[positions.length - 1];
    const totalWidth =
      lastPos.drawX + shift + glyphs[lastPos.charIdx].width + 4;

    canvas.width = Math.max(totalWidth, 1);
    canvas.height = cellHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const pos of positions) {
      const srcCol = pos.charIdx % numCellsX;
      const srcRow = Math.floor(pos.charIdx / numCellsX);
      ctx.drawImage(
        atlasImage,
        srcCol * cellWidth,
        srcRow * cellHeight,
        cellWidth,
        cellHeight,
        pos.drawX + shift,
        0,
        cellWidth,
        cellHeight,
      );
    }

    const scale =
      displayScale /
      (typeof window !== "undefined" ? window.devicePixelRatio : 1);
    canvas.style.setProperty("width", `${Math.floor(canvas.width * scale)}px`);
    canvas.style.setProperty(
      "height",
      `${Math.floor(canvas.height * scale)}px`,
    );
  }, [font, sampleText, displayScale]);

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground uppercase font-medium truncate flex-1 font-mono">
          {font.name}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span>{font.parsed.glyphs.length}g</span>
          <span>
            {font.parsed.cellWidth}×{font.parsed.cellHeight}
          </span>
          <span>t{font.parsed.tracking}</span>
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 opacity-0 group-hover:opacity-100"
          title="Remove from preview"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="bg-muted p-3 rounded-md overflow-auto flex items-center gap-2">
        <div className="flex-1 overflow-auto">
          {font.atlasImage ? (
            <canvas ref={canvasRef} style={{ imageRendering: "pixelated" }} />
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No embedded PNG — cannot render preview
            </p>
          )}
        </div>
        {!font.id.startsWith("local-") && (
          <a
            href={`/api/fonts/${font.id}`}
            download={font.name}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 opacity-0 group-hover:opacity-100"
            title="Download .fnt"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FntViewerTool() {
  const [sampleText, setSampleText] = useState(
    "The quick brown fox jumps over the lazy dog.",
  );
  const [displayScale, setDisplayScale] = useState(2);

  // Multi-font state
  const [activeFonts, setActiveFonts] = useState<LoadedFont[]>([]);

  // Library state
  const [libraryFonts, setLibraryFonts] = useState<FontMeta[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const localCounter = useRef(0);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const isActive = useCallback(
    (fontId: string) => {
      return activeFonts.some((f) => f.id === fontId);
    },
    [activeFonts],
  );

  const addLoadedFont = useCallback((font: LoadedFont) => {
    setActiveFonts((prev) => {
      const exists = prev.findIndex((f) => f.id === font.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = font;
        return next;
      }
      return [...prev, font];
    });
  }, []);

  const removeFont = useCallback((id: string) => {
    setActiveFonts((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ─── Library API ─────────────────────────────────────────────────────────

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/fonts");
      const data = await res.json();
      if (data.success) {
        setLibraryFonts(data.fonts);
      }
    } catch (err) {
      console.error("Failed to fetch font library:", err);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleBulkUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.name.endsWith(".fnt"),
      );
      if (fileArray.length === 0) return;

      setUploading(true);
      let success = 0;
      let failed = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress(`${i + 1}/${fileArray.length}: ${file.name}`);

        try {
          const fontId = stripExtension(file.name)
            .replace(/[^A-Za-z0-9_-]/g, "_")
            .slice(0, 80);

          const formData = new FormData();
          formData.append("file", file);
          formData.append("fontId", fontId);

          const res = await fetch("/api/fonts", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (data.success) {
            success++;
          } else {
            failed++;
            console.error(`Upload failed for ${file.name}:`, data.error);
          }
        } catch (err) {
          failed++;
          console.error(`Upload error for ${file.name}:`, err);
        }
      }

      setUploading(false);
      setUploadProgress("");
      await fetchLibrary();

      if (failed > 0) {
        alert(
          `Uploaded ${success} font${success !== 1 ? "s" : ""}. ${failed} failed.`,
        );
      }
    },
    [fetchLibrary],
  );

  const handleDeleteFont = useCallback(
    async (fontId: string) => {
      try {
        const res = await fetch(`/api/fonts/${fontId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          removeFont(fontId);
          await fetchLibrary();
        } else {
          alert(data.error || "Delete failed");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("Delete failed");
      }
      setDeleteTarget(null);
    },
    [removeFont, fetchLibrary],
  );

  const toggleLibraryFont = useCallback(
    async (font: FontMeta) => {
      if (isActive(font.fontId)) {
        removeFont(font.fontId);
        return;
      }

      try {
        const res = await fetch(`/api/fonts/${font.fontId}`);
        if (!res.ok) {
          alert("Failed to load font");
          return;
        }
        const buffer = await res.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        const parsed = parseFnt(text);

        let atlasImage: HTMLImageElement | null = null;
        if (parsed.pngBase64) {
          try {
            atlasImage = await loadAtlasImage(parsed.pngBase64);
          } catch {
            /* no atlas */
          }
        }

        addLoadedFont({
          id: font.fontId,
          name: font.originalName,
          parsed,
          atlasImage,
        });
      } catch (err) {
        console.error("Load error:", err);
        alert("Failed to load font");
      }
    },
    [isActive, removeFont, addLoadedFont],
  );

  // ─── Local file loading (multi) ────────────────────────────────────────

  const handleLocalFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".fnt")) continue;

        const text = await file.text();
        const parsed = parseFnt(text);

        let atlasImage: HTMLImageElement | null = null;
        if (parsed.pngBase64) {
          try {
            atlasImage = await loadAtlasImage(parsed.pngBase64);
          } catch {
            /* no atlas */
          }
        }

        localCounter.current++;
        addLoadedFont({
          id: `local-${localCounter.current}`,
          name: file.name,
          parsed,
          atlasImage,
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addLoadedFont],
  );

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleReset = () => {
    setActiveFonts([]);
    setSampleText("The quick brown fox jumps over the lazy dog.");
    setDisplayScale(2);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Left sidebar ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase">
                Load Fonts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">
                  Local .fnt Files
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fnt"
                  multiple
                  onChange={handleLocalFiles}
                  className="block w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground file:cursor-pointer cursor-pointer text-muted-foreground"
                  data-testid="input-fnt-file"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase block mb-1">
                  Display Scale
                </label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={displayScale}
                  onChange={(e) =>
                    setDisplayScale(parseInt(e.target.value) || 2)
                  }
                  data-testid="input-display-scale"
                />
              </div>

              {activeFonts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setLibraryOpen(!libraryOpen)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium uppercase">
                    Font Library
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {libraryFonts.length}
                  </Badge>
                </div>
                {libraryOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {libraryOpen && (
              <CardContent className="space-y-3">
                <div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept=".fnt"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleBulkUpload(e.target.files);
                      }
                      if (uploadInputRef.current)
                        uploadInputRef.current.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={uploading}
                    data-testid="button-upload-library"
                  >
                    {uploading ? (
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 mr-2" />
                    )}
                    {uploading
                      ? uploadProgress || "Uploading..."
                      : "Upload to Library"}
                  </Button>
                </div>

                {libraryLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : libraryFonts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No fonts in library yet
                  </p>
                ) : (
                  <div className="max-h-[400px] overflow-auto space-y-1">
                    {libraryFonts.map((font) => {
                      const active = isActive(font.fontId);
                      return (
                        <div
                          key={font.fontId}
                          className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-xs group transition-colors ${
                            active
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <button
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            onClick={() => toggleLibraryFont(font)}
                            data-testid={`button-toggle-${font.fontId}`}
                          >
                            <FileType
                              className={`w-3 h-3 flex-shrink-0 ${active ? "text-primary" : ""}`}
                            />
                            <span className="truncate font-mono">
                              {font.originalName}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatBytes(font.size)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(font.fontId);
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 opacity-0 group-hover:opacity-100"
                              title="Delete font"
                              data-testid={`button-delete-${font.fontId}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ── Right content area ── */}
        <div className="lg:col-span-3 space-y-4">
          {activeFonts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Eye className="w-8 h-8 mb-3" />
                <p className="text-sm uppercase font-medium">
                  Select fonts to preview
                </p>
                <p className="text-xs mt-1">
                  Load local .fnt files or click fonts in the library to compare
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm font-medium uppercase">
                  Sample Text
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {activeFonts.length} FONT{activeFonts.length !== 1 ? "S" : ""}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="Type sample text..."
                  data-testid="input-sample-text"
                />
                <div className="space-y-3">
                  {activeFonts.map((font) => (
                    <FontPreviewRow
                      key={font.id}
                      font={font}
                      sampleText={sampleText}
                      displayScale={displayScale}
                      onRemove={() => removeFont(font.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Font</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-mono font-bold">{deleteTarget}</span> from
              the library? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteFont(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
