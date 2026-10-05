import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./bible/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'bible',
    loadComponent: () =>
      import('./bible/book-list/book-list.component').then(m => m.BookListComponent),
  },
  {
    path: 'bible/:bookId',
    loadComponent: () =>
      import('./bible/chapter-list/chapter-list.component').then(m => m.ChapterListComponent),
  },
  {
    path: 'bible/:bookId/:chapter',
    loadComponent: () =>
      import('./bible/reader/reader.component').then(m => m.ReaderComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./favorites/favorites.component').then(m => m.FavoritesComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./about/about.component').then(m => m.AboutComponent),
  },
];
