import { useMemo } from 'react';
// стили тома изолируются в iframe — они рассчитаны на целую страницу
// (голые селекторы body/h2/table и т.п.), поэтому НЕ импортируются
// глобально, чтобы не поломать остальное приложение
// eslint-disable-next-line import/no-relative-packages
import tomeCss from '../../../tomes/style_v2.css?raw';

export function TomeFrame({ html }: { html: string }) {
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>${tomeCss}\nbody{padding:16px 0 60px}</style></head><body><div class="wrap">${html}</div></body></html>`,
    [html],
  );
  return (
    <iframe
      title="Глава справочника"
      srcDoc={srcDoc}
      className="h-[75vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700"
      sandbox=""
    />
  );
}
