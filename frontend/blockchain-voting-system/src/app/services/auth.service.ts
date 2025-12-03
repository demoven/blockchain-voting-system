import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3005'; // Auth Service URL
    private currentUserSubject = new BehaviorSubject<any>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.currentUserSubject.next(JSON.parse(savedUser));
        }
    }

    register(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, { email, password }).pipe(
            tap((res: any) => {
                this.setSession(res);
            })
        );
    }

    login(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
            tap((res: any) => {
                this.setSession(res);
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    private setSession(authResult: any) {
        localStorage.setItem('token', authResult.token);
        const user = { uid: authResult.uid, email: authResult.email }; // Add isAdmin if available from login response, or fetch it
        // Note: The login response in auth-service.js returns { uid, email, token }. 
        // It doesn't return isAdmin directly. We might need to verify token to get isAdmin or fetch it.
        // For now, let's store what we have.

        // Ideally we should call /verifyToken to get full user details including admin status
        // But let's assume for now we can get it or we will fetch it separately.

        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    // Helper to check if user is admin. 
    // Since the login response doesn't give isAdmin, we might need to fetch it.
    // Let's add a method to check admin status from the backend if needed, 
    // or we can rely on the /verifyToken endpoint which returns isAdmin.
    checkAdminStatus(): Observable<any> {
        return this.http.get(`${this.apiUrl}/verifyToken`, {
            headers: { Authorization: `Bearer ${this.getToken()}` }
        }).pipe(
            tap((user: any) => {
                const currentUser = this.currentUserSubject.value;
                if (currentUser) {
                    const updatedUser = { ...currentUser, isAdmin: user.isAdmin };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    this.currentUserSubject.next(updatedUser);
                }
            })
        );
    }

    isAdmin(): Observable<boolean> {
        return this.checkAdminStatus().pipe(
            map((user: any) => user.isAdmin)
        );
    }

    getUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/users`, {
            headers: { Authorization: `Bearer ${this.getToken()}` }
        });
    }
}
