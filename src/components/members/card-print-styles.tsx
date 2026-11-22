/** Print only the card, at true ID-1 size, on a white page. */
export function CardPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 15mm; }
        body { background: #fff !important; }
        body * { visibility: hidden; }
        .member-card, .member-card * { visibility: visible; }
        .member-card { position: absolute; left: 0; top: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  );
}
