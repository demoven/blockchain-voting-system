import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoteService } from '../../services/vote.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-vote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vote.component.html',
  styleUrls: ['./vote.component.css']
})
export class VoteComponent implements OnInit {
  voteData: any = null;
  voteControl = new FormControl('', Validators.required);
  errorMessage: string = '';
  voteId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private voteService: VoteService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    this.voteId = this.route.snapshot.paramMap.get('id') || '';
    if (this.voteId) {
      this.loadVoteDetails();
    } else {
      this.errorMessage = 'Invalid Vote ID';
    }
  }

  loadVoteDetails() {
    // Since we don't have a direct "getVoteById" for open votes in the backend (only getOpenVotes),
    // we fetch all open votes and find the one we need.
    // Ideally, the backend should provide a specific endpoint, but this works for now.
    this.voteService.getOpenVotes().subscribe({
      next: (votes) => {
        const vote = votes.find(v => v.voteId === this.voteId);
        if (vote) {
          this.voteData = vote;
        } else {
          this.errorMessage = 'Vote not found or you are not eligible to vote.';
        }
      },
      error: (err) => {
        this.errorMessage = 'Error loading vote details.';
      }
    });
  }

  submitVote() {
    if (this.voteControl.invalid || !this.voteControl.value) return;

    this.voteService.castVote(this.voteId, this.voteControl.value).subscribe({
      next: () => {
        this.modalService.open('Success', 'Vote submitted successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Failed to submit vote';
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
