import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class VoteService {
    private apiUrl = 'http://localhost:3000'; // Blockchain Service URL

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

    getOpenVotes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/votes/open`, { headers: this.getHeaders() });
    }

    getClosedVotes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/votes/closed`, { headers: this.getHeaders() });
    }

    createVote(subject: string, options: string[], votersUid: string[]): Observable<any> {
        return this.http.post(`${this.apiUrl}/startVote`, { subject, options, votersUid }, { headers: this.getHeaders() });
    }

    castVote(voteId: string, choice: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/vote`, { voteId, choice }, { headers: this.getHeaders() });
    }

    endVote(voteId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/endVote`, { voteId }, { headers: this.getHeaders() });
    }

    getResults(voteId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/results/${voteId}`, { headers: this.getHeaders() });
    }
}
