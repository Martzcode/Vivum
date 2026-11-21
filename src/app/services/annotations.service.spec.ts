import { TestBed } from '@angular/core/testing';
import { AnnotationsService } from './annotations.service';

function createService(): AnnotationsService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(AnnotationsService);
}

const ref = { version: 'ls1910' as const, bookId: 'john', chapter: 3, verse: 16 };

describe('AnnotationsService', () => {
  beforeEach(() => localStorage.clear());

  it('stores a highlight and a note on the same verse', () => {
    const service = createService();
    service.setColor(ref, 'green');
    service.setNote(ref, '  À méditer  ');

    expect(service.annotations()).toHaveLength(1);
    expect(service.get(ref)).toMatchObject({ color: 'green', note: 'À méditer' });
  });

  it('removes the annotation once it has neither color nor note', () => {
    const service = createService();
    service.setColor(ref, 'blue');
    service.setNote(ref, 'x');
    service.setColor(ref, null);
    expect(service.get(ref)).toBeDefined();

    service.setNote(ref, '   ');
    expect(service.get(ref)).toBeUndefined();
  });

  it('keeps annotations per version', () => {
    const service = createService();
    service.setColor(ref, 'pink');
    expect(service.get({ ...ref, version: 'kjv' })).toBeUndefined();
  });

  it('persists and ignores invalid stored data', () => {
    createService().setColor(ref, 'yellow');
    expect(createService().get(ref)?.color).toBe('yellow');

    localStorage.setItem('vivum-annotations-v1', JSON.stringify([{ bad: true }, null]));
    expect(createService().annotations()).toEqual([]);
  });
});
