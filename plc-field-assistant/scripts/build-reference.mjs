#!/usr/bin/env node
// Парсит tomes/tom-N-*.html в src/reference-data/tom-N.json.
// Не выполняется в браузере — тома меняются редко, гонять cheerio в
// рантайме приложения незачем. Запуск: node scripts/build-reference.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOMES_DIR = join(__dirname, '..', 'tomes');
const OUT_DIR = join(__dirname, '..', 'src', 'reference-data');

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(TOMES_DIR).filter((f) => /^tom-\d+.*\.html$/.test(f)).sort();

const tomesIndex = [];

for (const file of files) {
  const html = readFileSync(join(TOMES_DIR, file), 'utf8');
  const $ = cheerio.load(html);

  const tomTag = $('.tomtag').first().text().trim(); // "Том 1"
  const tomNumberMatch = tomTag.match(/\d+/);
  const tomNumber = tomNumberMatch ? Number(tomNumberMatch[0]) : files.indexOf(file) + 1;

  const h1 = $('.cover h1').first();
  const em = h1.find('em').first();
  const subtitle = em.text().trim();
  const title = h1.clone().children('em').remove().end().text().trim();
  const summary = $('.cover .sub').first().text().trim();

  const chapters = [];
  const headings = $('.wrap > h2[data-n]').toArray();

  headings.forEach((heading, idx) => {
    const $heading = $(heading);
    const id = $heading.attr('id') || `chapter-${idx + 1}`;
    const dataN = $heading.attr('data-n') || '';
    const chapterTitle = $heading.text().trim();

    // собираем все элементы между этим h2 и следующим h2[data-n] (или концом .wrap)
    const parts = [$.html($heading)];
    let node = $heading.next();
    while (node.length && !(node.is('h2') && node.attr('data-n'))) {
      parts.push($.html(node));
      node = node.next();
    }
    const bodyHtml = parts.join('\n');

    // текст без разметки — для поискового индекса
    const $tmp = cheerio.load(`<div>${bodyHtml}</div>`);
    const searchText = $tmp('div').text().replace(/\s+/g, ' ').trim();

    chapters.push({ id, dataN, title: chapterTitle, html: bodyHtml, searchText });
  });

  const tomSlug = file.replace(/^tom-(\d+)-(.+)\.html$/, 'tom-$1');
  const outPath = join(OUT_DIR, `${tomSlug}.json`);
  const tomData = { tomNumber, title, subtitle, summary, chapters };
  writeFileSync(outPath, JSON.stringify(tomData));

  tomesIndex.push({ tomNumber, title, subtitle, summary, slug: tomSlug, chapterCount: chapters.length });
  console.log(`${file}: ${chapters.length} глав -> ${tomSlug}.json`);
}

tomesIndex.sort((a, b) => a.tomNumber - b.tomNumber);
writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(tomesIndex, null, 2));
console.log(`Готово: ${tomesIndex.length} томов, индекс записан в reference-data/index.json`);
