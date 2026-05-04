import { REPORT_TYPE_LABELS } from './constants';

export interface YearMark {
  year: number;
  label: string;
  level: 'good' | 'caution' | 'risk';
}

export interface Section {
  title: string;
  content: string;
  highlights?: string[];
  score?: number;
  yearMarks?: YearMark[];
}

export interface KeyYear {
  year: number;
  event: string;
  importance: 'high' | 'medium';
}

export interface StructuredReport {
  title: string;
  overview: string;
  sections: Section[];
  summary: string;
  keyYears: KeyYear[];
  tags: string[];
  overallScore?: number;
  upsellHint?: string;
}

function plainTextToStructured(text: string, reportType?: string): StructuredReport {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*\{[\s\S]*\}\s*$/g, '')
    .trim();

  const sectionPattern = /(?:^|\n)(?:(?:#{1,3}\s+)|(?:[一二三四五六七八九十]+[、.]\s*)|(?:\d+[、.]\s*))(.*)/g;
  const splits: { title: string; start: number }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionPattern.exec(cleaned)) !== null) {
    splits.push({ title: sm[1].trim(), start: sm.index });
  }

  const sections: Section[] = [];
  if (splits.length >= 2) {
    for (let i = 0; i < splits.length; i++) {
      const start = splits[i].start + cleaned.slice(splits[i].start).indexOf('\n') + 1;
      const end = i + 1 < splits.length ? splits[i + 1].start : cleaned.length;
      sections.push({ title: splits[i].title, content: cleaned.slice(start, end).trim() });
    }
  } else {
    const paragraphs = cleaned.split(/\n{2,}/).filter((p) => p.trim());
    const overview = paragraphs.length > 1 ? paragraphs[0] : '';
    const bodyParas = paragraphs.length > 1 ? paragraphs.slice(1) : paragraphs;
    sections.push({ title: '命理分析', content: bodyParas.join('\n\n') });
    return {
      title: REPORT_TYPE_LABELS[reportType || ''] || '命理分析报告',
      overview,
      sections,
      summary: '',
      keyYears: [],
      tags: [],
    };
  }

  return {
    title: REPORT_TYPE_LABELS[reportType || ''] || '命理分析报告',
    overview: '',
    sections,
    summary: '',
    keyYears: [],
    tags: [],
  };
}

export function parseReportContent(content: string, reportType?: string): StructuredReport | null {
  // Layer 1: direct JSON parse
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.sections)) return parsed;
  } catch { /* continue to fallback layers */ }

  // Layer 2: extract JSON from truncated/dirty content
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    try {
      const titleMatch = trimmed.match(/"title"\s*:\s*"([^"]*?)"/);
      const overviewMatch = trimmed.match(/"overview"\s*:\s*"([^"]*?)"/);
      const tagsMatch = trimmed.match(/"tags"\s*:\s*\[([^\]]*)\]/);
      const scoreMatch = trimmed.match(/"overallScore"\s*:\s*(\d+)/);

      const sections: Section[] = [];
      const sectionRegex = /\{\s*"title"\s*:\s*"([^"]*?)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m: RegExpExecArray | null;
      while ((m = sectionRegex.exec(trimmed)) !== null) {
        const secContent = m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        const highlightsAfter = trimmed.slice(m.index);
        const hlMatch = highlightsAfter.match(/"highlights"\s*:\s*\[((?:[^\]])*)\]/);
        const scMatch = highlightsAfter.match(/"score"\s*:\s*(\d+)/);
        const highlights: string[] = [];
        if (hlMatch) {
          const hlItems = hlMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
          if (hlItems) hlItems.forEach((h) => highlights.push(h.replace(/^"|"$/g, '').replace(/\\"/g, '"')));
        }
        sections.push({
          title: m[1],
          content: secContent,
          highlights,
          score: scMatch ? parseInt(scMatch[1]) : undefined,
        });
      }

      if (sections.length > 0 || titleMatch) {
        const tags: string[] = [];
        if (tagsMatch) {
          const tagItems = tagsMatch[1].match(/"([^"]*?)"/g);
          if (tagItems) tagItems.forEach((t) => tags.push(t.replace(/^"|"$/g, '')));
        }
        return {
          title: titleMatch?.[1] || '',
          overview: overviewMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '',
          sections,
          summary: '',
          keyYears: [],
          tags,
          overallScore: scoreMatch ? parseInt(scoreMatch[1]) : undefined,
        };
      }
    } catch { /* continue to Layer 3 */ }
  }

  // Layer 3: plain text -> convert to structured report
  if (trimmed.length > 0 && !trimmed.startsWith('{')) {
    return plainTextToStructured(trimmed, reportType);
  }

  return null;
}
