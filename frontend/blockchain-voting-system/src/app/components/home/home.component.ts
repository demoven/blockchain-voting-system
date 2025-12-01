import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { VoteService } from '../../services/vote.service';
import { ModalService } from '../../services/modal.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  openVotes: any[] = [];
  closedVotes: any[] = [];
  authService = inject(AuthService);
  router = inject(Router);
  voteService = inject(VoteService);
  modalService = inject(ModalService);
  isAdmin: boolean = false;

  ngOnInit() {
    this.authService.isAdmin().subscribe((isAdmin: boolean) => {
      this.isAdmin = isAdmin;
    }

    );
    this.loadVotes();
  }

  loadVotes() {
    this.voteService.getOpenVotes().subscribe(votes => this.openVotes = votes);
    this.voteService.getClosedVotes().subscribe(votes => this.closedVotes = votes);
  }

  logout() {
    this.authService.logout();
  }

  endVote(voteId: string) {
    if (confirm('Are you sure you want to end this vote?')) {
      this.voteService.endVote(voteId).subscribe({
        next: () => {
          this.modalService.open('Success', 'Vote ended successfully');
          this.loadVotes();
        },
        error: (err) => this.modalService.open('Error', 'Error ending vote: ' + err.error.error)
      });
    }
  }

  createVote() {
    console.log('Creating vote');
    this.router.navigate(['/create-vote']);
  }
}
