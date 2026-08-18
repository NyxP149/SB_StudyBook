package com.jarvyx.studybook.note;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDFontDescriptor;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

/**
 * Reconstruit un markdown approximatif (titres, gras, italique, puces) à partir de
 * la taille/graisse de police détectée glyphe par glyphe. Un PDF n'a aucune notion
 * native de "titre" contrairement à un .docx (tout n'est que texte positionné par
 * police/taille) : c'est donc une heuristique, moins fiable qu'une vraie extraction
 * par styles, mais nettement mieux qu'un bloc de texte plat pour l'import "tel quel"
 * (sans IA).
 */
final class PdfMarkdownStripper {

    private static final String[] BULLET_MARKERS = {"•", "◦", "‣", "▪", "●", "·", "-", "*"};

    private PdfMarkdownStripper() {
    }

    static String toMarkdown(PDDocument document) throws IOException {
        LineCollectingStripper stripper = new LineCollectingStripper();
        stripper.setSortByPosition(true);
        stripper.getText(document);
        stripper.finalizeLastLine();

        List<Line> lines = stripper.getLines();
        float medianFontSize = medianFontSize(lines);

        StringBuilder markdown = new StringBuilder();
        StringBuilder paragraph = new StringBuilder();
        Line previous = null;

        for (Line line : lines) {
            String trimmed = line.text().strip();
            if (trimmed.isEmpty()) {
                flushParagraph(markdown, paragraph);
                previous = null;
                continue;
            }

            int headingLevel = medianFontSize > 0 ? headingLevelFromSize(line.avgFontSize(), medianFontSize) : 0;
            String bulletText = stripBulletPrefix(trimmed);

            if (headingLevel > 0) {
                flushParagraph(markdown, paragraph);
                markdown.append("#".repeat(headingLevel)).append(' ').append(styled(trimmed, line)).append("\n\n");
                previous = null;
            } else if (bulletText != null) {
                flushParagraph(markdown, paragraph);
                markdown.append("- ").append(styled(bulletText, line)).append("\n\n");
                previous = null;
            } else {
                String piece = styled(trimmed, line);
                boolean sameParagraph = previous != null
                        && Math.abs(previous.y() - line.y()) <= Math.max(previous.avgFontSize(), line.avgFontSize()) * 1.6f;
                if (sameParagraph) {
                    paragraph.append(' ').append(piece);
                } else {
                    flushParagraph(markdown, paragraph);
                    paragraph.append(piece);
                }
                previous = line;
            }
        }
        flushParagraph(markdown, paragraph);

        return markdown.toString().strip() + "\n";
    }

    private static void flushParagraph(StringBuilder markdown, StringBuilder paragraph) {
        if (!paragraph.isEmpty()) {
            markdown.append(paragraph).append("\n\n");
            paragraph.setLength(0);
        }
    }

    private static int headingLevelFromSize(float fontSize, float medianFontSize) {
        float ratio = fontSize / medianFontSize;
        if (ratio >= 1.8f) {
            return 1;
        }
        if (ratio >= 1.4f) {
            return 2;
        }
        if (ratio >= 1.15f) {
            return 3;
        }
        return 0;
    }

    private static String stripBulletPrefix(String trimmed) {
        for (String marker : BULLET_MARKERS) {
            if (trimmed.startsWith(marker + " ")) {
                return trimmed.substring(marker.length()).strip();
            }
        }
        if (trimmed.matches("^\\d{1,2}[.)]\\s+.*")) {
            return trimmed.replaceFirst("^\\d{1,2}[.)]\\s+", "");
        }
        return null;
    }

    private static String styled(String text, Line line) {
        String result = text;
        if (line.bold()) {
            result = "**" + result + "**";
        }
        if (line.italic()) {
            result = "*" + result + "*";
        }
        return result;
    }

    private static float medianFontSize(List<Line> lines) {
        List<Float> sizes = new ArrayList<>();
        for (Line line : lines) {
            if (!line.text().isBlank()) {
                sizes.add(line.avgFontSize());
            }
        }
        if (sizes.isEmpty()) {
            return 0f;
        }
        Collections.sort(sizes);
        int mid = sizes.size() / 2;
        return sizes.size() % 2 == 0 ? (sizes.get(mid - 1) + sizes.get(mid)) / 2f : sizes.get(mid);
    }

    private record Line(String text, float avgFontSize, boolean bold, boolean italic, float y) {
    }

    private static final class LineCollectingStripper extends PDFTextStripper {
        private final List<Line> lines = new ArrayList<>();
        private final StringBuilder currentText = new StringBuilder();
        private float sumFontSize;
        private int boldCount;
        private int italicCount;
        private int charCount;
        private Float firstY;

        LineCollectingStripper() throws IOException {
            super();
        }

        List<Line> getLines() {
            return lines;
        }

        void finalizeLastLine() {
            if (charCount > 0 || !currentText.isEmpty()) {
                flushLine();
            }
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) {
            currentText.append(text);
            for (TextPosition tp : textPositions) {
                sumFontSize += tp.getFontSizeInPt();
                charCount++;
                if (firstY == null) {
                    firstY = tp.getY();
                }
                PDFont font = tp.getFont();
                if (isBoldFont(font)) {
                    boldCount++;
                }
                if (isItalicFont(font)) {
                    italicCount++;
                }
            }
        }

        @Override
        protected void writeLineSeparator() throws IOException {
            flushLine();
            super.writeLineSeparator();
        }

        private void flushLine() {
            String text = currentText.toString();
            float avgFontSize = charCount > 0 ? sumFontSize / charCount : 0f;
            boolean bold = charCount > 0 && boldCount * 2 >= charCount;
            boolean italic = charCount > 0 && italicCount * 2 >= charCount;
            lines.add(new Line(text, avgFontSize, bold, italic, firstY != null ? firstY : 0f));

            currentText.setLength(0);
            sumFontSize = 0;
            boldCount = 0;
            italicCount = 0;
            charCount = 0;
            firstY = null;
        }

        private static boolean isBoldFont(PDFont font) {
            if (font == null) {
                return false;
            }
            PDFontDescriptor descriptor = font.getFontDescriptor();
            if (descriptor != null && descriptor.isForceBold()) {
                return true;
            }
            String name = font.getName();
            return name != null && name.toLowerCase(Locale.ROOT).contains("bold");
        }

        private static boolean isItalicFont(PDFont font) {
            if (font == null) {
                return false;
            }
            PDFontDescriptor descriptor = font.getFontDescriptor();
            if (descriptor != null && descriptor.isItalic()) {
                return true;
            }
            String name = font.getName();
            return name != null
                    && (name.toLowerCase(Locale.ROOT).contains("italic") || name.toLowerCase(Locale.ROOT).contains("oblique"));
        }
    }
}
