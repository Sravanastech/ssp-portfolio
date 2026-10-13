"""Build the teaching workbook from its Markdown source using python-docx."""
from pathlib import Path
import re

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.opc.constants import RELATIONSHIP_TYPE as RT

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/full-stack-learning-guide.md"
OUTPUT = ROOT / "docs/full-stack-learning-guide.docx"


def hyperlink(paragraph, text, url):
    relationship = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), relationship)
    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "1F4E79")
    props.append(color)
    run.append(props)
    value = OxmlElement("w:t")
    value.text = text
    run.append(value)
    link.append(run)
    paragraph._p.append(link)


def add_text(paragraph, text):
    for index, part in enumerate(re.split(r"(`[^`]+`|\*\*[^*]+\*\*)", text)):
        if not part:
            continue
        run = paragraph.add_run(part.strip("`*") if part.startswith(("`", "**")) else part)
        if part.startswith("`"):
            run.font.name = "Liberation Mono"
            run.font.size = Pt(9)
        elif part.startswith("**"):
            run.bold = True


def table(document, rows):
    headers, body = rows[0], rows[1:]
    count = len(headers)
    result = document.add_table(rows=1, cols=count)
    result.alignment = WD_TABLE_ALIGNMENT.CENTER
    result.autofit = False
    widths = [1.22, 2.1, 3.08] if count == 3 else [1.55, 4.85]
    if headers[0] == "Milestone":
        widths = [1.85, 1.05, 3.5]
    if headers[0] == "Component":
        widths = [2.05, 1.4, 2.95]
    for column, width in zip(result.columns, widths):
        column.width = Inches(width)
    for i, values in enumerate([headers] + body):
        cells = result.rows[0].cells if i == 0 else result.add_row().cells
        row_props = result.rows[i]._tr.get_or_add_trPr()
        row_props.append(OxmlElement("w:cantSplit"))
        if i == 0:
            row_props.append(OxmlElement("w:tblHeader"))
        for j, value in enumerate(values):
            cell = cells[j]
            cell.width = Inches(widths[j])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            props = cell._tc.get_or_add_tcPr()
            margins = OxmlElement("w:tcMar")
            for side in ("top", "left", "bottom", "right"):
                el = OxmlElement("w:" + side)
                el.set(qn("w:w"), "90")
                el.set(qn("w:type"), "dxa")
                margins.append(el)
            props.append(margins)
            borders = OxmlElement("w:tcBorders")
            for side in ("top", "left", "bottom", "right"):
                edge = OxmlElement("w:" + side)
                for key, val in (("val", "single"), ("sz", "4"), ("color", "D9D9D9")):
                    edge.set(qn("w:" + key), val)
                borders.append(edge)
            props.append(borders)
            if i == 0:
                shade = OxmlElement("w:shd")
                shade.set(qn("w:fill"), "DDE8F0")
                props.append(shade)
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(2)
            paragraph.paragraph_format.line_spacing = 1.05
            if headers[0] in ("Component", "Milestone") and j == 1:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = paragraph.add_run(value)
            run.font.size = Pt(9)
            run.bold = i == 0
    document.add_paragraph().paragraph_format.space_after = Pt(1)


def build():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(.65)
    section.bottom_margin = Inches(.65)
    section.left_margin = Inches(.9)
    section.right_margin = Inches(.9)
    section.header_distance = Inches(.25)
    section.footer_distance = Inches(.28)
    for name in ("Normal", "Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"):
        style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.color.rgb = RGBColor(0, 0, 0)
        for border in style._element.xpath(".//w:pBdr"):
            border.getparent().remove(border)
    normal = doc.styles["Normal"]
    normal.font.size = Pt(10.5)
    normal.paragraph_format.line_spacing = 1.10
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.widow_control = True
    doc.styles["Title"].font.size = Pt(26)
    doc.styles["Title"].paragraph_format.space_after = Pt(12)
    for name, size in (("Heading 1", 19), ("Heading 2", 12)):
        style = doc.styles[name]
        style.font.size = Pt(size)
        style.font.bold = True
        style.paragraph_format.space_before = Pt(10)
        style.paragraph_format.space_after = Pt(7)
        style.paragraph_format.keep_with_next = True
    header = section.header.paragraphs[0]
    header.add_run("PORTFOLIO DEVELOPMENT WORKBOOK").font.size = Pt(8)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer.add_run("Java and Spring Boot  •  5 October 2026  •  ").font.size = Pt(8)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    footer._p.append(field)
    doc.core_properties.title = "Full stack portfolio development and deployment guide"
    doc.core_properties.subject = "Architecture proposal and teaching workbook"
    doc.core_properties.author = "Portfolio project"
    lines = SOURCE.read_text().splitlines()
    i = 0
    first = True
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            for number, item in enumerate(code):
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.0
                p.paragraph_format.keep_with_next = number < len(code) - 1
                run = p.add_run(item or " ")
                run.font.name = "Liberation Mono"
                run.font.size = Pt(8.5)
            doc.add_paragraph().paragraph_format.space_after = Pt(0)
        elif line.startswith("| "):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [x.strip() for x in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[:\- ]+", x) for x in cells):
                    rows.append(cells)
                i += 1
            table(doc, rows)
            continue
        elif line.startswith("# "):
            if first:
                doc.add_paragraph(line[2:], "Title")
                first = False
            else:
                p = doc.add_paragraph(line[2:], "Heading 1")
                p.paragraph_format.page_break_before = True
        elif line.startswith("## "):
            doc.add_paragraph(line[3:], "Heading 2")
        elif line.startswith("- S") and " — https://" in line:
            title, url = line[2:].split(" — ", 1)
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(5)
            hyperlink(p, title, url)
        else:
            p = doc.add_paragraph()
            if line.startswith("- "):
                p.paragraph_format.left_indent = Inches(.12)
                p.paragraph_format.first_line_indent = Inches(-.12)
                add_text(p, "• " + line[2:])
            elif re.match(r"\d+\. ", line):
                p.paragraph_format.left_indent = Inches(.18)
                p.paragraph_format.first_line_indent = Inches(-.18)
                add_text(p, line)
            else:
                add_text(p, line)
        i += 1
    doc.save(OUTPUT)
    print(f"Created {OUTPUT}")
    print(f"Paragraphs: {len(doc.paragraphs)}; tables: {len(doc.tables)}")


if __name__ == "__main__":
    build()
