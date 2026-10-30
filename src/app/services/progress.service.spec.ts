import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';

function createService(): ProgressService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ProgressService);
}

describe('ProgressService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the current chapter and verse', () => {
    const service = createService();
    service.save({
      version: 'ls1910',
      bookId: 'john',
      bookName: 'Jean',
      chapter: 3,
    });

    expect(service.current()?.chapter).toBe(3);

    service.updateVerse(16);
    expect(service.current()?.verse).toBe(16);

    const restored = createService();
    expect(restored.current()?.verse).toBe(16);
    expect(restored.current()?.bookName).toBe('Jean');
  });

  it('keeps the verse when reopening the same chapter', () => {
    const service = createService();
    service.save({ version: 'ls1910', bookId: 'john', bookName: 'Jean', chapter: 3 });
    service.updateVerse(16);
    service.save({ version: 'ls1910', bookId: 'john', bookName: 'Jean', chapter: 3 });

    expect(service.current()?.verse).toBe(16);
  });

  it('keeps one history entry per book and version', () => {
    const service = createService();
    service.save({ version: 'ls1910', bookId: 'john', bookName: 'Jean', chapter: 3 });
    service.save({ version: 'ls1910', bookId: 'john', bookName: 'Jean', chapter: 5 });
    service.save({ version: 'ls1910', bookId: 'psalms', bookName: 'Psaumes', chapter: 23 });

    expect(service.recent()).toHaveLength(2);
    expect(service.recent()[0].bookId).toBe('psalms');
  });

  it('clears current position and history', () => {
    const service = createService();
    service.save({ version: 'ls1910', bookId: 'john', bookName: 'Jean', chapter: 3 });

    service.clear();

    expect(service.current()).toBeNull();
    expect(service.recent()).toEqual([]);
    expect(localStorage.getItem('vivum-reading-progress')).toBeNull();
  });
});
