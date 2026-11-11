import { Injectable, signal } from '@angular/core';

export interface SerialLine { text: string; time: string; type: 'info' | 'data' | 'warn' | 'error'; }
type SerialPortLike = { readable: ReadableStream<Uint8Array> | null; writable: WritableStream<Uint8Array> | null; open(options: { baudRate: number }): Promise<void>; close(): Promise<void>; };

@Injectable({ providedIn: 'root' })
export class SerialService {
  readonly connected = signal(false);
  readonly lines = signal<SerialLine[]>([{ text: 'Sistema iniciado. Aguardando ligação serial...', time: '--:--:--', type: 'info' }]);
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private buffer = '';
  onRfid: ((tag: string, porta: string) => void) | null = null;

  async connect(baudRate: number): Promise<void> {
    const serial = (navigator as Navigator & { serial?: { requestPort(): Promise<SerialPortLike> } }).serial;
    if (!serial) throw new Error('Web Serial API não suportada. Use Chrome/Edge com flag activada');
    this.port = await serial.requestPort();
    await this.port.open({ baudRate });
    this.connected.set(true);
    this.log(`Ligação serial estabelecida @ ${baudRate} baud`, 'info');
    if (this.port.readable) void this.read(this.port.readable);
  }
  private async read(stream: ReadableStream<Uint8Array>): Promise<void> {
    const decoder = new TextDecoderStream();
    void stream.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += value;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() ?? '';
        lines.map(line => line.trim()).filter(Boolean).forEach(line => this.process(line));
      }
    } catch (error) { this.log(`Leitura interrompida: ${String(error)}`, 'warn'); }
  }
  private process(line: string): void {
    this.log(line, line.startsWith('RFID:') ? 'data' : 'info');
    if (line.startsWith('RFID:')) {
      const [, tag, porta = 'PORTA_LAB1'] = line.split(':');
      if (tag) this.onRfid?.(tag, porta);
    }
  }
  async disconnect(): Promise<void> {
    await this.reader?.cancel();
    await this.port?.close();
    this.reader = null; this.port = null; this.connected.set(false);
    this.log('Ligação serial encerrada', 'warn');
  }
  async send(command: string): Promise<void> {
    if (!this.port?.writable) throw new Error('Arduino não ligado');
    const writer = this.port.writable.getWriter();
    await writer.write(new TextEncoder().encode(`${command}\n`));
    writer.releaseLock(); this.log(`> ${command}`, 'info');
  }
  log(text: string, type: SerialLine['type']): void {
    this.lines.update(lines => [...lines.slice(-49), { text, type, time: new Date().toLocaleTimeString('pt-AO') }]);
  }
}
