import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function formatMonto(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(fecha) {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

const TIPO_LABELS = {
  transferencia: 'Transferencia',
  carga_admin:   'Carga de saldo',
  cobro_qr:      'Cobro por QR',
};

export default function Comprobante({ transaccion, onClose }) {
  const { usuario } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const [errorPDF, setErrorPDF] = useState(false);

  const esEntrada = transaccion.usuario_destino_id === usuario.id;
  const esCarga   = transaccion.tipo === 'carga_admin';

  const nombreOrigen  = esCarga ? 'Administrador' : `${transaccion.origen_nombre} ${transaccion.origen_apellido}`;
  const nombreDestino = `${transaccion.destino_nombre} ${transaccion.destino_apellido}`;

  async function descargarPDF() {
    setDescargando(true);
    setErrorPDF(false);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210, pad = 20;
      let y = 20;

      // Cabecera azul
      doc.setFillColor(0, 100, 146);
      doc.roundedRect(pad, y, W - pad * 2, 48, 6, 6, 'F');
      doc.setTextColor(255, 255, 255);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(TIPO_LABELS[transaccion.tipo].toUpperCase(), W / 2, y + 14, { align: 'center' });

      const prefix = esEntrada || esCarga ? '+' : '-';
      doc.setFontSize(26);
      doc.text(`${prefix}$${formatMonto(transaccion.monto)}`, W / 2, y + 30, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(transaccion.estado.toUpperCase(), W / 2, y + 43, { align: 'center' });

      y += 58;

      const filas = [
        ['Fecha', formatFecha(transaccion.created_at)],
        ['Hora', formatHora(transaccion.created_at)],
        ...(!esCarga ? [['De', nombreOrigen]] : []),
        ['Para', nombreDestino],
        ...(transaccion.descripcion ? [['Concepto', transaccion.descripcion]] : []),
        ['Tipo', TIPO_LABELS[transaccion.tipo]],
        ['Nro de operacion', `#${String(transaccion.id).padStart(8, '0')}`],
      ];

      const rowH = 11;
      doc.setFillColor(249, 249, 249);
      doc.roundedRect(pad, y, W - pad * 2, filas.length * rowH + 8, 4, 4, 'F');
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.3);

      let ry = y + 4;
      filas.forEach(([label, valor], i) => {
        ry += rowH;
        if (i > 0) doc.line(pad + 4, ry - rowH, W - pad - 4, ry - rowH);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(95, 94, 94);
        doc.text(label, pad + 6, ry - 3);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 28, 28);
        doc.text(String(valor), W - pad - 6, ry - 3, { align: 'right' });
      });

      y += filas.length * rowH + 8 + 12;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(190, 200, 210);
      doc.text('AulaCash - simulacion educativa', W / 2, y, { align: 'center' });

      doc.save(`comprobante-${transaccion.id}.pdf`);
    } catch (e) {
      console.error(e);
      setErrorPDF(true);
    } finally {
      setDescargando(false);
    }
  }

  return (
    // z-[100] para estar por encima del BottomNav (z-50)
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl overflow-y-auto max-h-[92dvh] pb-[max(20px,env(safe-area-inset-bottom))]">

        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-[#1a1c1c]">Comprobante</h2>
          <button onClick={onClose} className="p-1 text-[#6e7881]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mx-4 mb-4 bg-white">

          <div className="bg-[#006492] rounded-2xl px-5 py-6 text-center text-white mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[26px]">
                {esCarga ? 'add_circle' : esEntrada ? 'south_west' : 'north_east'}
              </span>
            </div>
            <p className="text-[13px] font-semibold opacity-80 uppercase tracking-wider mb-1">
              {TIPO_LABELS[transaccion.tipo]}
            </p>
            <p className="text-[40px] font-bold tracking-tighter leading-none">
              {esEntrada || esCarga ? '+' : '-'}${formatMonto(transaccion.monto)}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-[#00ac46]" />
              <p className="text-[12px] font-semibold capitalize">{transaccion.estado}</p>
            </div>
          </div>

          <div className="bg-[#f9f9f9] rounded-2xl overflow-hidden divide-y divide-[#eeeeee]">
            <Fila label="Fecha" valor={formatFecha(transaccion.created_at)} />
            <Fila label="Hora" valor={formatHora(transaccion.created_at)} />
            {!esCarga && <Fila label="De" valor={nombreOrigen} />}
            <Fila label="Para" valor={nombreDestino} />
            {transaccion.descripcion && <Fila label="Concepto" valor={transaccion.descripcion} />}
            <Fila label="Tipo" valor={TIPO_LABELS[transaccion.tipo]} />
            <Fila label="N° de operación" valor={`#${String(transaccion.id).padStart(8, '0')}`} mono />
          </div>

          <p className="text-center text-[11px] text-[#bec8d2] mt-4">
            AulaCash — simulación educativa · Los saldos no representan dinero real
          </p>
        </div>

        <div className="px-4">
          {errorPDF && (
            <p className="text-[12px] text-[#ba1a1a] text-center mb-2">No se pudo generar el PDF. Intentá de nuevo.</p>
          )}
          <button
            onClick={descargarPDF}
            disabled={descargando}
            className="w-full h-14 bg-[#006492] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            {descargando ? 'Generando PDF...' : 'Descargar comprobante'}
          </button>
        </div>

      </div>
    </div>
  );
}

function Fila({ label, valor, mono }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <p className="text-[13px] text-[#5f5e5e] flex-shrink-0">{label}</p>
      <p className={`text-[13px] font-semibold text-[#1a1c1c] text-right ${mono ? 'font-mono' : ''}`}>{valor}</p>
    </div>
  );
}
