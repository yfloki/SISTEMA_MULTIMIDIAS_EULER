import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLiveManager } from '../src/live';

function fakeProc() {
  const p: any = new EventEmitter();
  p.kill = vi.fn();
  p.stderr = new EventEmitter();
  return p;
}

describe('live manager', () => {
  it('status começa inativo', () => {
    const m = createLiveManager({ hlsDir: mkdtempSync(path.join(tmpdir(), 'live-')) });
    expect(m.getStatus()).toEqual({ active: false, key: null, hlsPath: null, startedAt: null });
  });

  it('onPublish ativa e aponta o hlsPath; onDone desativa e mata o ffmpeg', () => {
    const proc = fakeProc();
    const spawnFfmpeg = vi.fn(() => proc);
    const m = createLiveManager({
      hlsDir: mkdtempSync(path.join(tmpdir(), 'live-')), spawnFfmpeg: spawnFfmpeg as any,
    });
    m.onPublish('aula01');
    const st = m.getStatus();
    expect(st.active).toBe(true);
    expect(st.key).toBe('aula01');
    expect(st.hlsPath).toBe('hls/live/aula01/index.m3u8');
    expect(spawnFfmpeg).toHaveBeenCalledOnce();
    m.onDone('aula01');
    expect(proc.kill).toHaveBeenCalled();
    expect(m.getStatus().active).toBe(false);
  });

  it('restream para YouTube: liga com ingest ativo, relay com -c copy, desliga no onDone', () => {
    const procs: any[] = [];
    const spawnFfmpeg = vi.fn(() => { const p = fakeProc(); procs.push(p); return p; });
    const m = createLiveManager({
      hlsDir: mkdtempSync(path.join(tmpdir(), 'live-')), spawnFfmpeg: spawnFfmpeg as any,
    });

    // ligar antes do ingest: fica pendente (enabled, mas sem relay rodando)
    let st = m.setRestream({ enabled: true, url: 'rtmp://a.rtmp.youtube.com/live2/abcd-1234' });
    expect(st.enabled).toBe(true);
    expect(st.running).toBe(false);

    // ingest chega: HLS + relay sobem (2 processos)
    m.onPublish('aula01');
    expect(spawnFfmpeg).toHaveBeenCalledTimes(2);
    const relayArgs = spawnFfmpeg.mock.calls[1][0] as string[];
    expect(relayArgs).toContain('-c');
    expect(relayArgs[relayArgs.indexOf('-c') + 1]).toBe('copy');
    expect(relayArgs[relayArgs.length - 1]).toBe('rtmp://a.rtmp.youtube.com/live2/abcd-1234');
    expect(m.getRestream().running).toBe(true);

    // fim do ingest mata os dois processos
    m.onDone('aula01');
    expect(procs[0].kill).toHaveBeenCalled();
    expect(procs[1].kill).toHaveBeenCalled();
    expect(m.getRestream().running).toBe(false);

    // desligar zera o enabled
    st = m.setRestream({ enabled: false });
    expect(st.enabled).toBe(false);
  });
});
