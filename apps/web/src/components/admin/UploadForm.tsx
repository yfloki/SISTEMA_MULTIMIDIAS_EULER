'use client';
import { useRef, useState } from 'react';
import { API_URL } from '@/lib/config';

export function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) { setMessage('Escolha um arquivo MP4.'); return; }
    const data = new FormData(e.currentTarget);
    data.set('file', file);
    setProgress(0);
    setMessage(null);

    // XMLHttpRequest: fetch não expõe progresso de upload
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/upload`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status === 201) {
        setMessage('✔ Enviado! O título entrou na fila de transcodificação abaixo.');
        setFile(null);
        formRef.current?.reset();
        onDone();
      } else {
        try { setMessage(`Erro: ${JSON.parse(xhr.responseText).error}`); }
        catch { setMessage(`Erro no upload (HTTP ${xhr.status}).`); }
      }
    };
    xhr.onerror = () => { setProgress(null); setMessage('Erro de rede no upload.'); };
    xhr.send(data);
  };

  return (
    <form ref={formRef} onSubmit={submit} className="glass flex flex-col gap-4 rounded-2xl p-6">
      <h2 className="font-display text-xl font-bold">Enviar novo título</h2>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed p-8 text-center transition
          ${dragOver ? 'border-(--accent) bg-(--accent)/10' : 'border-(--muted)/40 hover:border-(--accent)'}`}
      >
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.mkv" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file
          ? <span className="font-semibold">{file.name} <span className="text-muted">({(file.size / 1e6).toFixed(0)} MB)</span></span>
          : <span className="text-muted">Arraste um MP4 aqui ou clique para escolher</span>}
      </label>

      <input name="name" required placeholder="Nome do título"
        className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
      <textarea name="synopsis" rows={2} placeholder="Sinopse"
        className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
      <div className="flex gap-3">
        <input name="year" type="number" placeholder="Ano" min={1900} max={2100}
          className="w-28 rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
        <input name="genres" placeholder="Gêneros (separados por vírgula)"
          className="flex-1 rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
      </div>

      {progress !== null && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-(--accent) to-(--accent2) transition-all"
              style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">Enviando… {progress}%</p>
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}

      <button type="submit" disabled={progress !== null}
        className="glow rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) py-3 font-bold disabled:opacity-50">
        Enviar e transcodificar
      </button>
    </form>
  );
}
