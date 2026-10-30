import { TestBed } from '@angular/core/testing';
import { ClipboardService } from './clipboard.service';

function createService(): ClipboardService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ClipboardService);
}

const originalClipboard = navigator.clipboard;

describe('ClipboardService', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    delete (document as unknown as Record<string, unknown>)['execCommand'];
  });

  it('writes with the Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const service = createService();

    await expect(service.write('Jean 3:16')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('Jean 3:16');
  });

  it('falls back to execCommand when the Clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    });

    const service = createService();

    await expect(service.write('Jean 3:16')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('does not attempt to copy empty text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const service = createService();

    await expect(service.write('')).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});
