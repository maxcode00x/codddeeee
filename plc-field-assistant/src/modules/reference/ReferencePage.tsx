import { useMemo, useState } from 'react';
import { createSearch, search } from '../../lib/search';
import { Card, TextInput } from '../../components/ui';
import { TomeFrame } from './TomeFrame';
import tom1 from '../../reference-data/tom-1.json';
import tom2 from '../../reference-data/tom-2.json';
import tom3 from '../../reference-data/tom-3.json';
import tom4 from '../../reference-data/tom-4.json';
import tom5 from '../../reference-data/tom-5.json';

interface Chapter {
  id: string;
  dataN: string;
  title: string;
  html: string;
  searchText: string;
}
interface TomData {
  tomNumber: number;
  title: string;
  subtitle: string;
  summary: string;
  chapters: Chapter[];
}

const TOMES: TomData[] = [tom1, tom2, tom3, tom4, tom5];

interface FlatChapter {
  tomNumber: number;
  tomTitle: string;
  chapter: Chapter;
}

const ALL_CHAPTERS: FlatChapter[] = TOMES.flatMap((t) =>
  t.chapters.map((c) => ({ tomNumber: t.tomNumber, tomTitle: t.title, chapter: c })),
);

const searchIndex = createSearch(ALL_CHAPTERS, ['chapter.title', 'chapter.searchText']);

export function ReferencePage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FlatChapter | null>(null);

  const results = useMemo(() => (query.trim() ? search(searchIndex, query).slice(0, 20) : []), [query]);

  if (selected) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm font-medium text-green-600 hover:underline dark:text-green-400"
        >
          ← Ко всем томам
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Том {selected.tomNumber} · {selected.chapter.dataN} · {selected.chapter.title}
        </h2>
        <TomeFrame html={selected.chapter.html} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <TextInput
        placeholder="Поиск по всему справочнику — «PNP», «PROFIBUS терминаторы», «Reset выше Set»…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() ? (
        <Card title={`Найдено: ${results.length}`}>
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">Ничего не найдено.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {results.map((r) => (
                <li key={`${r.tomNumber}-${r.chapter.id}`}>
                  <button
                    onClick={() => setSelected(r)}
                    className="w-full py-2 text-left hover:text-green-600 dark:hover:text-green-400"
                  >
                    <span className="text-xs text-slate-400">Том {r.tomNumber} · {r.chapter.dataN}</span>
                    <br />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{r.chapter.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {TOMES.map((tom) => (
            <Card key={tom.tomNumber} title={`Том ${tom.tomNumber} · ${tom.title}`}>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{tom.summary}</p>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {tom.chapters.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected({ tomNumber: tom.tomNumber, tomTitle: tom.title, chapter: c })}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <span className="text-xs text-slate-400">{c.dataN}</span> {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
