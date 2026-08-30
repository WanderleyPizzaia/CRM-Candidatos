import { useState } from "react";
import type { PendingNotice } from "../lib/notify";
import { formatPhone, roleLabels, whatsappLink } from "../lib/format";

export function NotifyModal({
  notice,
  onClose,
}: {
  notice: PendingNotice;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(notice.message);
  const [copied, setCopied] = useState(false);
  const link = whatsappLink(notice.member.phone);

  const openWhatsApp = () => {
    if (!link) return;
    // O texto vai na URL, então precisa ir codificado.
    window.open(`${link}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span>AVISAR RESPONSÁVEL</span>
            <h2>{notice.subject}</h2>
            <p>
              {notice.member.name} · {roleLabels[notice.member.role] ?? notice.member.role}
              {notice.member.phone ? ` · ${formatPhone(notice.member.phone)}` : ""}
            </p>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        {link ? (
          <>
            <label className="field full">
              <span>Mensagem (edite se quiser antes de enviar)</span>
              <textarea
                className="notify-text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <p className="notify-hint">
              O WhatsApp abre numa aba nova com a mensagem pronta — é só apertar enviar.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={copy}>
                {copied ? "Copiado ✓" : "Copiar texto"}
              </button>
              <button className="secondary" onClick={onClose}>
                Agora não
              </button>
              <button className="primary" onClick={openWhatsApp}>
                ✆ Abrir WhatsApp
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="login-error">
              {notice.member.name} ainda não tem WhatsApp cadastrado. Adicione o telefone na aba
              Equipe para poder avisar por aqui.
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={onClose}>
                Entendi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
