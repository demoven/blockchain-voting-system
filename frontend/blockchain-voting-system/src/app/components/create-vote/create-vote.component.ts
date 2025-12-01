import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VoteService } from '../../services/vote.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-create-vote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-vote.component.html',
  styleUrls: ['./create-vote.component.css']
})
export class CreateVoteComponent {
  voteForm: FormGroup;
  errorMessage = '';

  constructor(
    private voteService: VoteService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: ModalService
  ) {
    this.voteForm = this.fb.group({
      subject: ['', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ]),
      voters: ['']
    });
  }

  get options() {
    return this.voteForm.get('options') as FormArray;
  }

  addOption() {
    this.options.push(this.fb.control('', Validators.required));
  }

  removeOption(index: number) {
    this.options.removeAt(index);
  }

  onSubmit() {
    if (this.voteForm.invalid) return;

    const { subject, options, voters } = this.voteForm.value;
    const votersUid = voters ? voters.split(',').map((id: string) => id.trim()).filter((id: string) => id !== '') : [];

    this.voteService.createVote(subject, options, votersUid).subscribe({
      next: () => {
        this.modalService.open('Success', 'Vote created successfully!');
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
