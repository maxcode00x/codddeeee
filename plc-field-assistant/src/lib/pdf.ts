import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IoPoint } from '../db/schema';

const STATUS_LABEL: Record<IoPoint['status'], string> = {
  not_checked: 'не проверено',
  checked: 'проверено',
  defect: 'дефект',
  fixed: 'исправлено',
};

export function exportIoProtocolPdf(points: IoPoint[], title: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [['Адрес', 'Тег', 'Тип', 'NO/NC', 'Описание', 'Кабель', 'Шкаф', 'Статус']],
    body: points.map((p) => [
      p.address,
      p.tagName,
      p.type,
      p.contactType ?? '',
      p.description,
      p.cable,
      p.cabinet,
      STATUS_LABEL[p.status],
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const status = points[data.row.index]?.status;
        if (status === 'defect') data.cell.styles.textColor = [180, 30, 30];
        if (status === 'fixed') data.cell.styles.textColor = [20, 120, 60];
      }
    },
  });

  doc.setFontSize(9);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  doc.text('Подпись: ______________________', 14, finalY);
  doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 160, finalY);

  doc.save(`io-protocol-${new Date().toISOString().slice(0, 10)}.pdf`);
}
