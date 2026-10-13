import {
  AlignmentType,
  Document as WordDocument,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import {
  Document as PdfDocument,
  Link as PdfLink,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { Fragment } from "react";
import type { CvDocument, CvEducation, CvLanguage } from "./cv";
import { formatCvPeriod } from "./cv";

function clean(value: string) {
  return value.replace(/[\u2022\u25cf]/g, "").replace(/\s+/g, " ").trim();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function textRun(text: string, options: { bold?: boolean; size?: number } = {}) {
  return new TextRun({
    text: clean(text),
    font: "Arial",
    size: options.size ?? 20,
    bold: options.bold,
  });
}

function wordHeading(text: string) {
  return new Paragraph({
    text: clean(text).toUpperCase(),
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 220, after: 80 },
    style: "CvHeading",
  });
}

function wordBullet(text: string) {
  return new Paragraph({
    children: [textRun(text)],
    bullet: { level: 0 },
    spacing: { after: 45 },
  });
}

function wordLine(text: string, options: { bold?: boolean; size?: number } = {}) {
  return new Paragraph({
    children: [textRun(text, options)],
    spacing: { after: 45 },
  });
}

function wordLink(label: string, url: string) {
  return new ExternalHyperlink({
    children: [textRun(label, { size: 18 })],
    link: url,
  });
}

function wordLinksChildren(links: Array<{ label: string; url: string }>) {
  return links.flatMap((link, index) => [
    ...(index > 0 ? [textRun(" | ", { size: 18 })] : []),
    wordLink(link.label || link.url, link.url),
  ]);
}

function wordLinksLine(links: Array<{ label: string; url: string }>) {
  const children = wordLinksChildren(links);
  return new Paragraph({ children, spacing: { after: 45 } });
}

function wordExperienceLine(title: string, company: string, companyLink?: string) {
  const children: Array<TextRun | ExternalHyperlink> = [textRun(title, { bold: true })];
  if (company) {
    children.push(textRun(" | "));
    children.push(companyLink ? wordLink(company, companyLink) : textRun(company, { bold: true }));
  }
  return new Paragraph({ children, spacing: { after: 45 } });
}

function wordProjectLinks(project: CvDocument["projects"][number]) {
  const links = [
    ...(project.googlePlay ? [{ label: "Google Play", url: project.googlePlay }] : []),
    ...(project.appStore ? [{ label: "App Store", url: project.appStore }] : []),
  ];
  if (!links.length) return null;
  return wordLinksLine(links);
}

function addWordEducation(item: CvEducation) {
  const title = [item.degree, item.field].filter(Boolean).join(" in ");
  const period = item.startDate || item.endDate ? formatCvPeriod(item.startDate, item.endDate) : "";
  const details = [item.institution, item.location, period, item.gpa ? `GPA: ${item.gpa}` : ""]
    .filter(Boolean)
    .join(" | ");
  return [
    wordLine(title || item.institution, { bold: true }),
    wordLine(details),
    ...(item.details ? [wordLine(item.details)] : []),
  ];
}

function addWordLanguage(item: CvLanguage) {
  return wordLine([item.name, item.proficiency].filter(Boolean).join(" - "));
}

export async function downloadCvDocx(document: CvDocument, filename: string) {
  const children: Paragraph[] = [
    new Paragraph({
      children: [textRun(document.name, { bold: true, size:  thirtyTwo })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [textRun(document.targetTitle, { bold: true, size:  twentyFour })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [textRun([document.email, document.phone, document.location].filter(Boolean).join(" | "), { size:  eighteen })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 45 },
    }),
    new Paragraph({
      children: document.links.length
        ? wordLinksChildren(document.links)
        : [textRun("", { size: eighteen })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
  ];

  if (document.summary) {
    children.push(wordHeading("Professional Summary"), wordLine(document.summary));
  }

  if (document.education.length) {
    children.push(wordHeading("Education"));
    document.education.forEach((item) => children.push(...addWordEducation(item)));
  }

  if (document.experiences.length) {
    children.push(wordHeading("Experience"));
    document.experiences.forEach((experience) => {
      children.push(
        wordExperienceLine(experience.title, experience.company, experience.companyLink),
        wordLine(formatCvPeriod(experience.startDate, experience.endDate)),
        ...experience.bullets.map(wordBullet)
      );
    });
  }

  if (document.projects.length) {
    children.push(wordHeading("Selected Projects"));
    document.projects.forEach((project) => {
      children.push(wordLine(project.name, { bold: true }));
      if (project.website) children.push(wordLinksLine([{ label: "Project website", url: project.website }]));
      const projectLinks = wordProjectLinks(project);
      if (projectLinks) children.push(projectLinks);
      children.push(...project.bullets.map(wordBullet));
      if (project.technologies.length) {
        children.push(wordLine(`Technologies: ${project.technologies.join(", ")}`, { size: 18 }));
      }
    });
  }

  if (document.skillGroups.length || document.keywords.length) {
    children.push(wordHeading("Technical Skills"));
    document.skillGroups.forEach((group) => {
      children.push(wordLine(`${group.title}: ${group.skills.join(", ")}`));
    });
    if (document.keywords.length) children.push(wordLine(`Additional: ${document.keywords.join(", ")}`));
  }

  if (document.certifications.length) {
    children.push(wordHeading("Certifications"));
    document.certifications.forEach((item) => {
      children.push(wordLine([item.name, item.issuer, item.date].filter(Boolean).join(" | ")));
      if (item.url) children.push(wordLine(item.url, { size: 18 }));
    });
  }

  if (document.languages.length) {
    children.push(wordHeading("Languages"));
    document.languages.forEach((item) => children.push(addWordLanguage(item)));
  }

  if (document.achievements.length) {
    children.push(wordHeading("Additional Achievements"), ...document.achievements.map(wordBullet));
  }

  const word = new WordDocument({
    creator: document.name,
    title: `${document.name} - ${document.targetTitle}`,
    description: "ATS-friendly resume",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20 },
          paragraph: { spacing: { line: 260 } },
        },
      },
      paragraphStyles: [
        {
          id: "CvHeading",
          name: "CV Section Heading",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", bold: true, size: 22 },
          paragraph: { spacing: { before: 220, after: 80 } },
        },
      ],
    },
    sections: [{ properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } }, children }],
  });

  const blob = await Packer.toBlob(word);
  downloadBlob(blob, filename);
}

const thirtyTwo = 32;
const twentyFour = 24;
const eighteen = 18;

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingRight: 42,
    paddingBottom: 36,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    color: "#111111",
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  header: { textAlign: "center", marginBottom: 12, paddingBottom: 3 },
  name: { fontSize: 22, lineHeight: 1.15, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  title: { fontSize: 11, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  contact: { fontSize: 8.5, lineHeight: 1.25, marginBottom: 3 },
  link: { color: "#1f4e79", textDecoration: "underline" },
  section: { marginTop: 10 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    borderBottomWidth: 0.7,
    borderBottomColor: "#777777",
    paddingBottom: 2,
  },
  paragraph: { marginBottom: 5 },
  entry: { marginBottom: 7 },
  entryTitle: { fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 2 },
  muted: { fontSize: 8.5, marginBottom: 3 },
  bullet: { marginLeft: 11, marginBottom: 2 },
  skill: { marginBottom: 3 },
});

function PdfSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function PdfBullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} style={pdfStyles.bullet}>
          • {clean(item)}
        </Text>
      ))}
    </View>
  );
}

function PdfLinks({ links }: { links: Array<{ label: string; url: string }> }) {
  return (
    <Text style={pdfStyles.contact}>
      {links.map((link, index) => (
        <Fragment key={link.url}>
          {index > 0 ? " | " : ""}
          <PdfLink src={link.url} style={pdfStyles.link}>{clean(link.label || link.url)}</PdfLink>
        </Fragment>
      ))}
    </Text>
  );
}

export function CvPdf({ document }: { document: CvDocument }) {
  return (
    <PdfDocument title={`${document.name} - ${document.targetTitle}`} author={document.name}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.name}>{clean(document.name)}</Text>
          <Text style={pdfStyles.title}>{clean(document.targetTitle)}</Text>
          <Text style={pdfStyles.contact}>{[document.email, document.phone, document.location].filter(Boolean).join(" | ")}</Text>
          {document.links.length > 0 && <PdfLinks links={document.links} />}
        </View>

        {document.summary && <PdfSection title="Professional Summary"><Text style={pdfStyles.paragraph}>{clean(document.summary)}</Text></PdfSection>}

        {document.education.length > 0 && <PdfSection title="Education">
          {document.education.map((item) => <View key={item.id} style={pdfStyles.entry}>
            <Text style={pdfStyles.entryTitle}>{[item.degree, item.field].filter(Boolean).join(" in ") || item.institution}</Text>
            <Text style={pdfStyles.muted}>{[item.institution, item.location, item.startDate || item.endDate ? formatCvPeriod(item.startDate, item.endDate) : "", item.gpa ? `GPA: ${item.gpa}` : ""].filter(Boolean).join(" | ")}</Text>
            {item.details && <Text style={pdfStyles.paragraph}>{clean(item.details)}</Text>}
          </View>)}
        </PdfSection>}

        {document.experiences.length > 0 && <PdfSection title="Experience">
          {document.experiences.map((experience) => <View key={experience.id} style={pdfStyles.entry}>
            <Text style={pdfStyles.entryTitle}>
              {clean(experience.title)}
              {experience.company ? " | " : ""}
              {experience.companyLink ? <PdfLink src={experience.companyLink} style={pdfStyles.link}>{clean(experience.company)}</PdfLink> : clean(experience.company)}
            </Text>
            <Text style={pdfStyles.muted}>{formatCvPeriod(experience.startDate, experience.endDate)}</Text>
            <PdfBullets items={experience.bullets} />
          </View>)}
        </PdfSection>}

        {document.projects.length > 0 && <PdfSection title="Selected Projects">
          {document.projects.map((project) => <View key={project.id} style={pdfStyles.entry}>
            <Text style={pdfStyles.entryTitle}>{clean(project.name)}</Text>
            {project.website && <PdfLinks links={[{ label: "Project website", url: project.website }]} />}
            {(project.googlePlay || project.appStore) && <PdfLinks links={[
              ...(project.googlePlay ? [{ label: "Google Play", url: project.googlePlay }] : []),
              ...(project.appStore ? [{ label: "App Store", url: project.appStore }] : []),
            ]} />}
            <PdfBullets items={project.bullets} />
            {project.technologies.length > 0 && <Text style={pdfStyles.paragraph}>Technologies: {project.technologies.join(", ")}</Text>}
          </View>)}
        </PdfSection>}

        {(document.skillGroups.length > 0 || document.keywords.length > 0) && <PdfSection title="Technical Skills">
          {document.skillGroups.map((group) => <Text key={group.title} style={pdfStyles.skill}>{clean(group.title)}: {group.skills.join(", ")}</Text>)}
          {document.keywords.length > 0 && <Text style={pdfStyles.skill}>Additional: {document.keywords.join(", ")}</Text>}
        </PdfSection>}

        {document.certifications.length > 0 && <PdfSection title="Certifications">
          {document.certifications.map((item) => <View key={item.id} style={pdfStyles.entry}>
            <Text style={pdfStyles.paragraph}>{[item.name, item.issuer, item.date].filter(Boolean).join(" | ")}</Text>
            {item.url && <Text style={pdfStyles.muted}>{item.url}</Text>}
          </View>)}
        </PdfSection>}

        {document.languages.length > 0 && <PdfSection title="Languages">
          {document.languages.map((item) => <Text key={item.id} style={pdfStyles.paragraph}>{[item.name, item.proficiency].filter(Boolean).join(" - ")}</Text>)}
        </PdfSection>}

        {document.achievements.length > 0 && <PdfSection title="Additional Achievements"><PdfBullets items={document.achievements} /></PdfSection>}
      </Page>
    </PdfDocument>
  );
}

export async function downloadCvPdf(document: CvDocument, filename: string) {
  const blob = await pdf(<CvPdf document={document} />).toBlob();
  downloadBlob(blob, filename);
}
import React from 'react';
