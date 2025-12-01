import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    authService = inject(AuthService);
    router = inject(Router);

    canActivate(): Observable<boolean> {
        return this.authService.isAdmin().pipe(
            tap((isAdmin: boolean) => {
                if (!isAdmin) {
                    this.router.navigate(['/']);
                }
            })
        );
    }
}
