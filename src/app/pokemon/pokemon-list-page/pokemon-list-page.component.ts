import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store, select } from '@ngrx/store';
import {
  PokemonFeatureState,
  pokemonListSelector,
  pokemonCountSelector,
  pokemonLoadingSelector,
  pokemonPageableSelector
} from '../pokemon.reducer';
import { LoadPokemons } from '../pokemon.actions';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { PokeApiNamedResource, PokeApiPageable } from '../pokeapi';
import {
  withLatestFrom,
  map,
  takeWhile,
  take,
  debounceTime,
  filter
} from 'rxjs/operators';

@Component({
  selector: 'app-pokemon-list-page',
  templateUrl: './pokemon-list-page.component.html',
  styleUrls: ['./pokemon-list-page.component.scss']
})
export class PokemonListPageComponent implements OnInit, OnDestroy {
  constructor(private store$: Store<PokemonFeatureState>) {}

  mounted = true;
  loading$: Observable<boolean>;
  pokemons$: Observable<PokeApiNamedResource[]>;
  count$: Observable<number>;
  pageable$: Observable<PokeApiPageable>;

  page$ = new BehaviorSubject<number>(1);
  limit$ = new BehaviorSubject<number>(10);

  ngOnInit() {
    this.pokemons$ = this.store$.pipe(select(pokemonListSelector));
    this.count$ = this.store$.pipe(select(pokemonCountSelector));
    this.loading$ = this.store$.pipe(select(pokemonLoadingSelector));

    this.pageable$ = this.page$.pipe(
      withLatestFrom(this.limit$),
      map(([page, limit]) => ({
        offset: limit * page - limit,
        limit
      })),
      debounceTime(200)
    );

    this.store$
      .pipe(
        takeWhile(() => this.mounted),
        select(pokemonPageableSelector),
        withLatestFrom(this.pageable$)
      )
      .subscribe(([next, current]) => {
        if (current.limit !== next.limit) {
          this.limit$.next(next.limit);
        }
        if (current.offset !== next.offset) {
          this.page$.next(this.calculatePage(next));
        }
      });

    this.pageable$
      .pipe(takeWhile(() => this.mounted))
      .subscribe((pageable: PokeApiPageable) => this.loadPokemons(pageable));
  }

  ngOnDestroy() {
    this.mounted = false;
  }

  setPage(page: number): void {
    this.page$.next(page);
  }

  private loadPokemons(pageable: PokeApiPageable): void {
    this.store$.dispatch(new LoadPokemons(pageable));
  }

  private calculatePage({ offset, limit }: PokeApiPageable): number {
    const pageCount = Math.floor(offset / limit);
    return offset % limit === 0 ? pageCount + 1 : pageCount;
  }
}
