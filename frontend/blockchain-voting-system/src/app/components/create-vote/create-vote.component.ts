import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoteService } from '../../services/vote.service';

@Component({
  selector: 'app-create-vote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-vote.component.html',
  styleUrls: ['./create-vote.component.css']
})
export class CreateVoteComponent {
  subject = '';
  options: string[] = ['', '']; // Start with 2 empty options
  votersInput = '';
  errorMessage = '';

  constructor(private voteService: VoteService, private router: Router) { }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  addOption() {
    this.options.push('');
  }

  removeOption(index: number) {
    this.options.splice(index, 1);
  }

  isValid(): boolean {
    return this.subject.trim() !== '' && this.options.every(o => o.trim() !== '') && this.options.length >= 2;
  }

  onSubmit() {
    if (!this.isValid()) return;

    const votersUid = this.votersInput.split(',').map(id => id.trim()).filter(id => id !== '');

    this.voteService.createVote(this.subject, this.options, votersUid).subscribe({
      next: () => {
        alert('Vote created successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Failed to create vote';
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
