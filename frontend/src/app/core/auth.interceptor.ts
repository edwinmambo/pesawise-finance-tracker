import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Attaches the access token to every request. On a 401 it transparently tries a
 * single refresh and replays the request; if that fails, it logs out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.token())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall || !auth.token()) {
        return throwError(() => err);
      }
      // Access token likely expired — refresh once, then replay.
      return from(auth.refresh()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            auth.logout();
            return throwError(() => err);
          }
          return next(withToken(newToken));
        }),
      );
    }),
  );
};
